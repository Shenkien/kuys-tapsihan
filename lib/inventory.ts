import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getBusinessSettings } from "@/lib/settings";

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

// ---------------------------------------------------------------------------
// Waste/Spoilage Logging Module
// ---------------------------------------------------------------------------
// A dedicated, more deliberate flow than the quick restock/deduct actions:
// every entry is always a stock *decrease*, always tagged with a reason
// category, and always shows up in the waste log below — a plain
// ADJUSTMENT transaction alone doesn't distinguish "we recounted and found
// 2 less" from "the chicken spoiled overnight", which matters for a food
// business trying to track shrinkage.

export type WasteReason = "WASTE" | "SPOILAGE" | "RECOUNT" | "OTHER";

const WASTE_REASON_LABEL: Record<WasteReason, string> = {
  WASTE: "Waste",
  SPOILAGE: "Spoilage",
  RECOUNT: "Recount/Correction",
  OTHER: "Other",
};

export interface WasteLogInput {
  inventoryItemId: string;
  quantity: number; // always positive; always subtracted
  reason: WasteReason;
  details?: string;
}

export async function logWaste(input: WasteLogInput) {
  const note = `[${WASTE_REASON_LABEL[input.reason]}] ${input.details?.trim() || ""}`.trim();
  return prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: input.inventoryItemId } });
    const newQty = Number(item.quantityOnHand) - input.quantity;
    if (newQty < 0) {
      throw new Error("INSUFFICIENT_STOCK");
    }
    const updated = await tx.inventoryItem.update({
      where: { id: input.inventoryItemId },
      data: { quantityOnHand: newQty },
    });
    await tx.inventoryTransaction.create({
      data: {
        inventoryItemId: input.inventoryItemId,
        type: "ADJUSTMENT",
        quantity: input.quantity,
        note,
      },
    });
    return updated;
  });
}

/** Read-only history for the waste log screen — every ADJUSTMENT
 * transaction, newest first, joined with the item it applies to. */
export function getWasteLog(limit = 100) {
  return prisma.inventoryTransaction.findMany({
    where: { type: "ADJUSTMENT" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { inventoryItem: { select: { name: true, unit: true } } },
  });
}

// ---------------------------------------------------------------------------
// Inventory Valuation Report
// ---------------------------------------------------------------------------

/** Current stock value (quantityOnHand x unitCost) per item, rolled up by
 * category and as a grand total — the "how much money is sitting on the
 * shelf right now" report. Items with no unitCost set are still listed
 * (so gaps in costing data are visible) but contribute 0 to the total. */
export async function getInventoryValuation() {
  const items = await prisma.inventoryItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const rows = items.map((item) => {
    const qty = Number(item.quantityOnHand);
    const cost = item.unitCost !== null ? Number(item.unitCost) : null;
    const value = cost !== null ? Math.round(qty * cost * 100) / 100 : 0;
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantityOnHand: qty,
      unitCost: cost,
      value,
      missingCost: cost === null,
    };
  });

  const byCategory = new Map<string, number>();
  for (const row of rows) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + row.value);
  }

  const totalValue = Math.round(rows.reduce((s, r) => s + r.value, 0) * 100) / 100;
  const itemsMissingCost = rows.filter((r) => r.missingCost).length;

  return {
    items: rows,
    byCategory: [...byCategory.entries()].map(([category, value]) => ({ category, value })),
    totalValue,
    itemsMissingCost,
  };
}

// ---------------------------------------------------------------------------
// Economic Order Quantity (EOQ) Suggestion Function
// ---------------------------------------------------------------------------
// Classic inventory-theory formula: EOQ = sqrt( (2 * D * S) / H )
//   D = annual demand (units/year)     — estimated from recent DEDUCTION history
//   S = ordering cost (₱ per order)    — BusinessSettings.orderingCost
//   H = annual holding cost (₱/unit)   — unitCost * BusinessSettings.holdingCostRate
// This gives the order quantity that minimizes total ordering + holding
// cost — not just "reorder when low", but "reorder *this much* to be
// most cost-efficient" — the same model taught in Operations Management.

export interface EoqSuggestion {
  id: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  reorderThreshold: number;
  avgDailyUsage: number;
  daysUntilStockout: number | null;
  eoq: number | null; // suggested order quantity; null if not enough data (no cost or no usage history)
  annualDemand: number;
}

/** Looks back `lookbackDays` of DEDUCTION transactions to estimate each
 * item's average daily consumption, then projects an annual demand figure
 * and runs the EOQ formula against it. Items with no cost set or no usage
 * history in the window still show up (so the gap is visible) but get
 * eoq: null instead of a fabricated number. */
export async function getEoqSuggestions(lookbackDays = 30): Promise<EoqSuggestion[]> {
  const settings = await getBusinessSettings();
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const items = await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });

  const usage = await prisma.inventoryTransaction.groupBy({
    by: ["inventoryItemId"],
    where: { type: "DEDUCTION", createdAt: { gte: since } },
    _sum: { quantity: true },
  });
  const usageMap = new Map(usage.map((u) => [u.inventoryItemId, Number(u._sum.quantity ?? 0)]));

  return items.map((item) => {
    const totalUsed = usageMap.get(item.id) ?? 0;
    const avgDailyUsage = Math.round((totalUsed / lookbackDays) * 100) / 100;
    const annualDemand = Math.round(avgDailyUsage * 365);
    const unitCost = item.unitCost !== null ? Number(item.unitCost) : null;

    const qtyOnHand = Number(item.quantityOnHand);
    const daysUntilStockout = avgDailyUsage > 0 ? Math.floor(qtyOnHand / avgDailyUsage) : null;

    let eoq: number | null = null;
    if (unitCost !== null && unitCost > 0 && annualDemand > 0) {
      const orderingCost = Number(settings.orderingCost);
      const holdingCostPerUnit = unitCost * (Number(settings.holdingCostRate) / 100);
      if (holdingCostPerUnit > 0) {
        eoq = Math.round(Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit));
      }
    }

    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      quantityOnHand: qtyOnHand,
      reorderThreshold: Number(item.reorderThreshold),
      avgDailyUsage,
      daysUntilStockout,
      eoq,
      annualDemand,
    };
  });
}
