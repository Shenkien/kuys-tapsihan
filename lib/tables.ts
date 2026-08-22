import prisma from "@/lib/prisma";

export function getTables() {
  return prisma.diningTable.findMany({
    orderBy: { tableNumber: "asc" },
    include: { _count: { select: { orders: true } } },
  });
}

export interface TableInput {
  tableNumber: string;
}

export function createTable(data: TableInput) {
  return prisma.diningTable.create({
    data: { tableNumber: data.tableNumber.trim() },
  });
}

export interface UpdateTableInput {
  tableNumber?: string;
  isActive?: boolean;
}

export function updateTable(id: string, data: UpdateTableInput) {
  return prisma.diningTable.update({
    where: { id },
    data: {
      ...(data.tableNumber !== undefined && { tableNumber: data.tableNumber.trim() }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

/** Issues a brand-new QR token for a table (e.g. a printed QR sticker got
 * damaged, or the owner suspects an old QR code image leaked). Any
 * previously printed QR sticker for this table stops working immediately —
 * a fresh one has to be printed/reissued from the new token. */
export function regenerateTableQrToken(id: string) {
  return prisma.diningTable.update({
    where: { id },
    data: { qrCodeToken: crypto.randomUUID() },
  });
}

/** Refuses to delete a table that still has orders linked to it (past
 * receipts should always be able to say which table they came from) —
 * deactivate it instead so it drops off the active QR/kiosk flow but the
 * order history stays intact. */
export async function deleteTable(id: string) {
  const orderCount = await prisma.order.count({ where: { tableId: id } });
  if (orderCount > 0) {
    return { ok: false as const, orderCount };
  }

  await prisma.diningTable.delete({ where: { id } });
  return { ok: true as const };
}
