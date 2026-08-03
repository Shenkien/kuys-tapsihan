import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export function getInventoryItems() {
  return prisma.inventoryItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}

export function getInventoryItem(id: string) {
  return prisma.inventoryItem.findUnique({
    where: { id },
    include: { usedIn: { include: { menuItem: true } } },
  });
}

export interface InventoryItemInput {
  name: string;
  category?: string;
  unit: string;
  quantityOnHand?: number;
  reorderThreshold?: number;
  unitCost?: number;
}

export function createInventoryItem(data: InventoryItemInput) {
  return prisma.inventoryItem.create({
    data: {
      name: data.name,
      category: data.category || "Uncategorized",
      unit: data.unit,
      quantityOnHand: data.quantityOnHand ?? 0,
      reorderThreshold: data.reorderThreshold ?? 0,
      unitCost: data.unitCost ?? null,
    },
  });
}

/** Updates details (name/unit/threshold/cost). For stock quantity, prefer
 * updateStock/restockItem/deductStock so a transaction record is kept. */
export function updateInventoryItem(id: string, data: Partial<InventoryItemInput>) {
  return prisma.inventoryItem.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.reorderThreshold !== undefined && { reorderThreshold: data.reorderThreshold }),
      ...(data.unitCost !== undefined && { unitCost: data.unitCost }),
      ...(data.quantityOnHand !== undefined && { quantityOnHand: data.quantityOnHand }),
    },
  });
}

export function deleteInventoryItem(id: string) {
  return prisma.inventoryItem.delete({ where: { id } });
}

export function getLowStockItems() {
  return prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      category: string;
      unit: string;
      quantityOnHand: Prisma.Decimal;
      reorderThreshold: Prisma.Decimal;
    }>
  >`
    SELECT id, name, category, unit, "quantityOnHand", "reorderThreshold"
    FROM inventory_items
    WHERE "quantityOnHand" <= "reorderThreshold"
    ORDER BY name ASC
  `;
}

export function getInventoryByCategory(category: string) {
  return prisma.inventoryItem.findMany({
    where: { category },
    orderBy: { name: "asc" },
  });
}

/**
 * General stock adjustment by a signed delta (positive = add, negative =
 * remove). Logs an ADJUSTMENT transaction. Prefer restockItem/deductStock
 * for the common, more specific cases below.
 */
export async function updateStock(id: string, delta: number, note?: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id } });
    const newQty = Number(item.quantityOnHand) + delta;
    if (newQty < 0) {
      throw new Error("INSUFFICIENT_STOCK");
    }
    const updated = await tx.inventoryItem.update({
      where: { id },
      data: { quantityOnHand: newQty },
    });
    await tx.inventoryTransaction.create({
      data: {
        inventoryItemId: id,
        type: "ADJUSTMENT",
        quantity: Math.abs(delta),
        note: note || null,
      },
    });
    return updated;
  });
}

export async function restockItem(id: string, quantity: number, note?: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id } });
    const updated = await tx.inventoryItem.update({
      where: { id },
      data: { quantityOnHand: Number(item.quantityOnHand) + quantity },
    });
    await tx.inventoryTransaction.create({
      data: { inventoryItemId: id, type: "RESTOCK", quantity, note: note || null },
    });
    return updated;
  });
}

export async function deductStock(id: string, quantity: number, orderId?: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id } });
    const newQty = Number(item.quantityOnHand) - quantity;
    if (newQty < 0) {
      throw new Error("INSUFFICIENT_STOCK");
    }
    const updated = await tx.inventoryItem.update({
      where: { id },
      data: { quantityOnHand: newQty },
    });
    await tx.inventoryTransaction.create({
      data: {
        inventoryItemId: id,
        type: "DEDUCTION",
        quantity,
        orderId: orderId || null,
      },
    });
    return updated;
  });
}

export async function checkStockAvailability(id: string, quantity: number) {
  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) return false;
  return Number(item.quantityOnHand) >= quantity;
}
