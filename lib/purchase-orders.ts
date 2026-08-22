import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class PurchaseOrderError extends Error {}

const poInclude = {
  supplier: { select: { id: true, name: true } },
  createdBy: { select: { name: true } },
  items: { include: { inventoryItem: { select: { id: true, name: true, unit: true } } } },
} satisfies Prisma.PurchaseOrderInclude;

export function getPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: poInclude,
  });
}

export function getPurchaseOrder(id: string) {
  return prisma.purchaseOrder.findUnique({ where: { id }, include: poInclude });
}

async function nextPoNumber(tx: Prisma.TransactionClient): Promise<string> {
  const count = await tx.purchaseOrder.count();
  return `PO-${String(count + 1).padStart(6, "0")}`;
}

export interface PurchaseOrderInput {
  supplierId: string;
  notes?: string;
  items: { inventoryItemId: string; quantityOrdered: number; unitCost: number }[];
}

export function createPurchaseOrder(data: PurchaseOrderInput, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const poNumber = await nextPoNumber(tx);
    return tx.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        notes: data.notes?.trim() || null,
        createdById,
        items: {
          create: data.items.map((i) => ({
            inventoryItemId: i.inventoryItemId,
            quantityOrdered: i.quantityOrdered,
            unitCost: i.unitCost,
          })),
        },
      },
      include: poInclude,
    });
  });
}

/** DRAFT -> ORDERED: marks the PO as sent to the supplier. Purely a status
 * change — no stock moves until it's actually RECEIVED. */
export async function markPurchaseOrderOrdered(id: string) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new PurchaseOrderError("Purchase order not found.");
  if (po.status !== "DRAFT") {
    throw new PurchaseOrderError(`This PO is already "${po.status.toLowerCase()}".`);
  }

  return prisma.purchaseOrder.update({
    where: { id },
    data: { status: "ORDERED", orderedAt: new Date() },
    include: poInclude,
  });
}

/**
 * ORDERED -> RECEIVED: confirms delivery and, in the same transaction,
 * restocks every line item — a RESTOCK InventoryTransaction is written per
 * line, referencing this PO's number in its note, so the Stock Transaction
 * Module and this Purchase Order module share one consistent audit trail
 * instead of the receiving clerk having to restock everything a second
 * time by hand on the Inventory screen.
 */
export async function receivePurchaseOrder(id: string) {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!po) throw new PurchaseOrderError("Purchase order not found.");
    if (po.status === "RECEIVED") throw new PurchaseOrderError("This PO was already received.");
    if (po.status === "CANCELLED") throw new PurchaseOrderError("This PO was cancelled and can't be received.");

    for (const line of po.items) {
      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: line.inventoryItemId } });
      await tx.inventoryItem.update({
        where: { id: line.inventoryItemId },
        data: {
          quantityOnHand: Number(item.quantityOnHand) + Number(line.quantityOrdered),
          unitCost: Number(line.unitCost), // latest purchase cost becomes the new costing basis
        },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: line.inventoryItemId,
          type: "RESTOCK",
          quantity: line.quantityOrdered,
          note: `Received ${po.poNumber}`,
        },
      });
    }

    return tx.purchaseOrder.update({
      where: { id },
      data: { status: "RECEIVED", receivedAt: new Date() },
      include: poInclude,
    });
  });
}

export async function cancelPurchaseOrder(id: string) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new PurchaseOrderError("Purchase order not found.");
  if (po.status === "RECEIVED") throw new PurchaseOrderError("A received PO can't be cancelled.");

  return prisma.purchaseOrder.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: poInclude,
  });
}
