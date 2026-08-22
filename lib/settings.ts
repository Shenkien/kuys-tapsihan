import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type DbClient = typeof prisma | Prisma.TransactionClient;

/**
 * System Settings — Sales Configuration.
 *
 * A small tapsihan has exactly one till and one tax configuration, so this
 * is a lazily-created singleton row rather than something seeded up front:
 * the first call after a fresh migration creates it with sane PH defaults,
 * so createOrder/markOrderPaid never have to special-case "no settings yet".
 *
 * Accepts an optional Prisma transaction client so callers inside
 * `prisma.$transaction(...)` (createOrder, markOrderPaid) read/create the
 * settings row as part of the same transaction instead of a separate
 * connection.
 */
export async function getBusinessSettings(client: DbClient = prisma) {
  const existing = await client.businessSettings.findFirst();
  if (existing) return existing;

  return client.businessSettings.create({ data: {} });
}

export interface UpdateBusinessSettingsInput {
  vatRate?: number;
  vatInclusive?: boolean;
  serviceChargeRate?: number;
  seniorPwdDiscountRate?: number;
  receiptPrefix?: string;
  orderingCost?: number;
  holdingCostRate?: number;
}

export async function updateBusinessSettings(input: UpdateBusinessSettingsInput) {
  const current = await getBusinessSettings();
  return prisma.businessSettings.update({
    where: { id: current.id },
    data: input,
  });
}
