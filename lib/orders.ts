import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getBusinessSettings } from "@/lib/settings";

/** Thrown for expected, user-facing problems (out of stock, item removed
 * from menu, etc). The API route catches this and returns its message
 * as-is; anything else is an unexpected error and gets a generic message. */
export class OrderError extends Error {}

function isOrderNumberConflict(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    Array.isArray((err.meta as { target?: string[] } | undefined)?.target) &&
    (err.meta as { target: string[] }).target.includes("orderNumber")
  );
}

async function generateOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const countToday = await tx.order.count({ where: { createdAt: { gte: startOfDay } } });
  const datePart = `${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const seqPart = String(countToday + 1).padStart(4, "0");
  return `${datePart}-${seqPart}`;
}

export interface CreateOrderItemAddOnInput {
  addOnId: string;
  quantity: number;
}

export interface CreateOrderItemInput {
  menuItemId?: string;
  comboMealId?: string;
  quantity: number;
  notes?: string;
  addOns?: CreateOrderItemAddOnInput[];
}

export interface CreateOrderInput {
  channel: "KIOSK" | "QR";
  tableId?: string | null;
  customerName?: string;
  paymentMethod?: "CASH" | "GCASH" | "MAYA" | "CARD";
  notes?: string;
  items: CreateOrderItemInput[];
}

const MAX_ORDER_NUMBER_RETRIES = 3;

/**
 * Creates an order end-to-end in a single transaction:
 *  1. Re-fetches every menu item / combo meal / add-on fresh from the DB
 *     (never trusts client-submitted prices or availability).
 *  2. Computes subtotal/total server-side, including any selected add-ons.
 *  3. Deducts inventory per the recipe on each item — including, for combo
 *     lines, every item bundled inside the combo — failing the whole order
 *     if anything would go below zero.
 *  4. Retries a couple times on the rare daily-order-number race.
 */
export async function createOrder(input: CreateOrderInput) {
  if (input.items.length === 0) {
    throw new OrderError("Your cart is empty.");
  }
  for (const line of input.items) {
    if (Boolean(line.menuItemId) === Boolean(line.comboMealId)) {
      throw new OrderError("Something is wrong with your cart. Please refresh and try again.");
    }
  }

  for (let attempt = 0; attempt < MAX_ORDER_NUMBER_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const menuItemIds = [...new Set(input.items.map((i) => i.menuItemId).filter((v): v is string => Boolean(v)))];
        const comboMealIds = [...new Set(input.items.map((i) => i.comboMealId).filter((v): v is string => Boolean(v)))];
        const addOnIds = [...new Set(input.items.flatMap((i) => i.addOns?.map((a) => a.addOnId) ?? []))];

        const [menuItems, comboMeals, addOns] = await Promise.all([
          tx.menuItem.findMany({
            where: { id: { in: menuItemIds }, deletedAt: null },
            include: { ingredients: true },
          }),
          tx.comboMeal.findMany({
            where: { id: { in: comboMealIds } },
            include: { items: { include: { menuItem: { include: { ingredients: true } } } } },
          }),
          tx.addOn.findMany({ where: { id: { in: addOnIds } } }),
        ]);

        const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));
        const comboMealMap = new Map(comboMeals.map((c) => [c.id, c]));
        const addOnMap = new Map(addOns.map((a) => [a.id, a]));

        if (input.tableId) {
          const table = await tx.diningTable.findUnique({ where: { id: input.tableId } });
          if (!table || !table.isActive) {
            throw new OrderError("This table's QR code is no longer active. Please ask staff for help.");
          }
        }

        const lines = input.items.map((line) => {
          if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 50) {
            throw new OrderError("One of the items in your cart has an invalid quantity.");
          }

          const selectedAddOns = (line.addOns ?? []).map((sel) => {
            const addOn = addOnMap.get(sel.addOnId);
            if (!addOn || !addOn.isAvailable) {
              throw new OrderError("One of the add-ons in your cart is no longer available. Please review your cart.");
            }
            if (!Number.isInteger(sel.quantity) || sel.quantity < 1 || sel.quantity > 20) {
              throw new OrderError(`Invalid quantity for add-on "${addOn.name}".`);
            }
            return { name: addOn.name, price: Number(addOn.price), quantity: sel.quantity };
          });
          const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price * a.quantity, 0);

          if (line.menuItemId) {
            const menuItem = menuItemMap.get(line.menuItemId);
            if (!menuItem) {
              throw new OrderError("One of the items in your cart is no longer on the menu. Please review your cart.");
            }
            if (!menuItem.isAvailable) {
              throw new OrderError(`"${menuItem.name}" just became unavailable. Please remove it from your cart.`);
            }
            const unitPrice = Number(menuItem.price);
            const subtotal = Math.round((unitPrice * line.quantity + addOnsTotal) * 100) / 100;
            return {
              kind: "menuItem" as const,
              menuItem,
              comboMeal: null,
              quantity: line.quantity,
              unitPrice,
              subtotal,
              notes: line.notes || null,
              addOns: selectedAddOns,
            };
          }

          const comboMeal = comboMealMap.get(line.comboMealId!);
          if (!comboMeal) {
            throw new OrderError("One of the combo meals in your cart is no longer available. Please review your cart.");
          }
          if (!comboMeal.isAvailable) {
            throw new OrderError(`"${comboMeal.name}" just became unavailable. Please remove it from your cart.`);
          }
          for (const included of comboMeal.items) {
            if (!included.menuItem.isAvailable || included.menuItem.deletedAt) {
              throw new OrderError(
                `"${comboMeal.name}" includes "${included.menuItem.name}", which is no longer available. Please remove it from your cart.`
              );
            }
          }
          const unitPrice = Number(comboMeal.price);
          const subtotal = Math.round((unitPrice * line.quantity + addOnsTotal) * 100) / 100;
          return {
            kind: "combo" as const,
            menuItem: null,
            comboMeal,
            quantity: line.quantity,
            unitPrice,
            subtotal,
            notes: line.notes || null,
            addOns: selectedAddOns,
          };
        });

        const subtotal = Math.round(lines.reduce((sum, l) => sum + l.subtotal, 0) * 100) / 100;

        // --- Tax & Service Charge Computation ---
        // Menu prices are VAT-inclusive by default (settings.vatInclusive),
        // matching how prices are actually posted at a Philippine eatery —
        // so `subtotal` already contains VAT and no extra tax line is added
        // on top. If the owner switches to VAT-exclusive pricing, VAT is
        // computed and added on top of the subtotal instead. Any senior
        // citizen/PWD VAT exemption is applied later, at payment time, once
        // the discount is actually confirmed at the counter.
        const settings = await getBusinessSettings(tx);
        const vatRate = Number(settings.vatRate);
        const serviceChargeRate = Number(settings.serviceChargeRate);

        const taxAmount = settings.vatInclusive ? 0 : Math.round(subtotal * (vatRate / 100) * 100) / 100;
        const serviceChargeAmount = Math.round(subtotal * (serviceChargeRate / 100) * 100) / 100;
        const totalAmount = Math.round((subtotal + taxAmount + serviceChargeAmount) * 100) / 100;

        const orderNumber = await generateOrderNumber(tx);

        const order = await tx.order.create({
          data: {
            orderNumber,
            channel: input.channel,
            tableId: input.tableId || null,
            customerName: input.customerName?.trim() || null,
            paymentMethod: input.paymentMethod ?? null,
            subtotal,
            taxAmount,
            serviceChargeAmount,
            totalAmount,
            notes: input.notes?.trim() || null,
            items: {
              create: lines.map((l) => ({
                menuItemId: l.kind === "menuItem" ? l.menuItem!.id : null,
                comboMealId: l.kind === "combo" ? l.comboMeal!.id : null,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                subtotal: l.subtotal,
                notes: l.notes,
                addOns: {
                  create: l.addOns.map((a) => ({ name: a.name, price: a.price, quantity: a.quantity })),
                },
              })),
            },
          },
          include: {
            items: {
              include: {
                menuItem: { select: { name: true } },
                comboMeal: { select: { name: true } },
                addOns: true,
              },
            },
            table: { select: { tableNumber: true } },
          },
        });

        // Deduct inventory per recipe, in the same transaction — if any
        // ingredient can't cover this order, everything above rolls back.
        // Combo lines deduct inventory for every item bundled inside them.
        const deductions: { inventoryItemId: string; needed: number }[] = [];
        for (const line of lines) {
          if (line.kind === "menuItem") {
            for (const ingredient of line.menuItem!.ingredients) {
              deductions.push({
                inventoryItemId: ingredient.inventoryItemId,
                needed: Number(ingredient.quantityUsed) * line.quantity,
              });
            }
          } else {
            for (const included of line.comboMeal!.items) {
              for (const ingredient of included.menuItem.ingredients) {
                deductions.push({
                  inventoryItemId: ingredient.inventoryItemId,
                  needed: Number(ingredient.quantityUsed) * included.quantity * line.quantity,
                });
              }
            }
          }
        }

        const neededByItem = new Map<string, number>();
        for (const d of deductions) {
          neededByItem.set(d.inventoryItemId, (neededByItem.get(d.inventoryItemId) ?? 0) + d.needed);
        }

        for (const [inventoryItemId, needed] of neededByItem) {
          const invItem = await tx.inventoryItem.findUniqueOrThrow({ where: { id: inventoryItemId } });
          const nextQty = Number(invItem.quantityOnHand) - needed;
          if (nextQty < 0) {
            throw new OrderError(`Sorry, we don't have enough "${invItem.name}" in stock right now.`);
          }
          await tx.inventoryItem.update({ where: { id: inventoryItemId }, data: { quantityOnHand: nextQty } });
          await tx.inventoryTransaction.create({
            data: { inventoryItemId, type: "DEDUCTION", quantity: needed, orderId: order.id },
          });
        }

        return order;
      });
    } catch (err) {
      if (err instanceof OrderError) throw err;
      if (isOrderNumberConflict(err) && attempt < MAX_ORDER_NUMBER_RETRIES - 1) continue;
      throw err;
    }
  }

  throw new OrderError("Could not create your order right now. Please try again.");
}

// ---------------------------------------------------------------------------
// Kitchen queue (staff-facing)
// ---------------------------------------------------------------------------

const kitchenOrderInclude = {
  items: {
    include: {
      menuItem: { select: { name: true } },
      comboMeal: { select: { name: true } },
      addOns: true,
    },
  },
  table: { select: { tableNumber: true } },
} satisfies Prisma.OrderInclude;

export type KitchenOrder = Prisma.OrderGetPayload<{ include: typeof kitchenOrderInclude }>;

/** Orders staff still need to act on — everything that isn't finished or
 * cancelled yet, oldest first so the queue reads top-to-bottom in the
 * order things came in. */
export function getKitchenQueue() {
  return prisma.order.findMany({
    where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] } },
    orderBy: { createdAt: "asc" },
    include: kitchenOrderInclude,
  });
}

/** Shapes a Prisma order (with the include above) into the flat structure
 * lib/receipt.ts expects for the kitchen slip / on-screen preview. */
export function toReceiptData(order: KitchenOrder) {
  return {
    orderNumber: order.orderNumber,
    channel: order.channel,
    tableNumber: order.table?.tableNumber ?? null,
    customerName: order.customerName,
    createdAt: order.createdAt,
    subtotal: Number(order.subtotal),
    totalAmount: Number(order.totalAmount),
    notes: order.notes,
    items: order.items.map((item) => ({
      name: item.menuItem?.name ?? item.comboMeal?.name ?? "Item",
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
      notes: item.notes,
      addOns: item.addOns.map((a) => ({ name: a.name, price: Number(a.price), quantity: a.quantity })),
    })),
  };
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
};

/**
 * Drives an order forward through the kitchen queue.
 *  - PENDING -> CONFIRMED ("RECEIVE"): staff has accepted it and the
 *    kitchen slip is about to print. Stamps `printedAt`.
 *  - CONFIRMED -> PREPARING ("START PREPARING"): kitchen has started
 *    cooking it.
 *  - PREPARING -> READY ("MARK READY"): food is done, waiting for
 *    pickup/serving.
 *  - READY -> COMPLETED ("COMPLETE"): food handed to the customer.
 *  - any of the above -> CANCELLED: reverses every DEDUCTION this order made, in the
 *    same transaction, by writing offsetting RETURN transactions and
 *    restoring `quantityOnHand` — so a cancelled order never leaves
 *    inventory permanently short.
 */
export async function updateOrderStatus(
  orderId: string,
  nextStatus: "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED",
  handledById: string
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new OrderError("Order not found.");

    const allowed = VALID_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new OrderError(`Order is "${order.status.toLowerCase()}" and can't move to "${nextStatus.toLowerCase()}".`);
    }

    if (nextStatus === "CANCELLED") {
      const deductions = await tx.inventoryTransaction.findMany({
        where: { orderId, type: "DEDUCTION" },
      });
      for (const d of deductions) {
        await tx.inventoryItem.update({
          where: { id: d.inventoryItemId },
          data: { quantityOnHand: { increment: d.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: d.inventoryItemId,
            type: "RETURN",
            quantity: d.quantity,
            orderId,
            note: "Reversed — order cancelled",
          },
        });
      }
    }

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        handledById,
        ...(nextStatus === "CONFIRMED" ? { printedAt: new Date() } : {}),
      },
      include: kitchenOrderInclude,
    });

    return updated;
  });
}

/** Minimal, safe-for-public fields — used by the guest order-status view.
 * Deliberately omits cost/inventory data and anything internal. */
export function getOrderStatus(id: string) {
  return prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      channel: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      customerName: true,
      subtotal: true,
      taxAmount: true,
      serviceChargeAmount: true,
      discountType: true,
      discountAmount: true,
      receiptNumber: true,
      totalAmount: true,
      notes: true,
      createdAt: true,
      table: { select: { tableNumber: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
          notes: true,
          menuItem: { select: { name: true } },
          comboMeal: { select: { name: true } },
          addOns: { select: { name: true, price: true, quantity: true } },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Payment Transaction Module
// ---------------------------------------------------------------------------

export interface MarkOrderPaidInput {
  paymentMethod: "CASH" | "GCASH" | "MAYA" | "CARD";
  discountType?: "NONE" | "SENIOR_CITIZEN" | "PWD" | "PROMO";
  discountReason?: string;
  /** Only used for PROMO — SENIOR_CITIZEN/PWD always use the configured rate. */
  discountAmount?: number;
}

async function nextReceiptNumber(tx: Prisma.TransactionClient, prefix: string): Promise<string> {
  const count = await tx.order.count({ where: { paymentStatus: "PAID" } });
  return `${prefix}-${String(count + 1).padStart(6, "0")}`;
}

/**
 * Confirms cash/e-wallet payment for an order and, in the same transaction,
 * applies any senior-citizen/PWD or promo discount and assigns the Official
 * Receipt number. This is deliberately a separate step from order creation:
 * discount eligibility (valid senior/PWD ID) is verified at the counter
 * when the customer actually pays, not when the order is first placed.
 *
 * RA 9994 (Expanded Senior Citizens Act) / RA 10754 (PWD): a qualified
 * senior citizen or PWD gets 20% off *and* the sale becomes VAT-exempt —
 * so confirming one of these discount types also zeroes out any tax this
 * order was carrying.
 */
export async function markOrderPaid(orderId: string, input: MarkOrderPaidInput, handledById: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new OrderError("Order not found.");
    if (order.status === "CANCELLED") {
      throw new OrderError("This order was cancelled and can't be marked as paid.");
    }
    if (order.paymentStatus === "PAID") {
      throw new OrderError("This order has already been paid.");
    }
    if (order.paymentStatus === "REFUNDED") {
      throw new OrderError("This order was refunded and can't be marked as paid again.");
    }

    const discountType = input.discountType ?? "NONE";
    const settings = await getBusinessSettings(tx);
    const subtotal = Number(order.subtotal);

    let discountAmount = 0;
    let taxAmount = Number(order.taxAmount);

    if (discountType === "SENIOR_CITIZEN" || discountType === "PWD") {
      if (!input.discountReason || input.discountReason.trim().length < 3) {
        throw new OrderError("Please record the senior citizen/PWD ID number as the discount reason.");
      }
      discountAmount = Math.round(subtotal * (Number(settings.seniorPwdDiscountRate) / 100) * 100) / 100;
      taxAmount = 0; // VAT-exempt sale
    } else if (discountType === "PROMO") {
      if (!input.discountAmount || input.discountAmount <= 0) {
        throw new OrderError("Enter a promo discount amount greater than 0.");
      }
      if (!input.discountReason || input.discountReason.trim().length < 3) {
        throw new OrderError("Please note the promo code or reason for this discount.");
      }
      discountAmount = Math.round(input.discountAmount * 100) / 100;
    }

    if (discountAmount > subtotal) {
      throw new OrderError("Discount can't be larger than the order subtotal.");
    }

    const totalAmount =
      Math.round((subtotal + taxAmount + Number(order.serviceChargeAmount) - discountAmount) * 100) / 100;

    const receiptNumber = await nextReceiptNumber(tx, settings.receiptPrefix);

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paymentMethod: input.paymentMethod,
        discountType,
        discountAmount,
        discountReason: discountType === "NONE" ? null : input.discountReason?.trim() || null,
        taxAmount,
        totalAmount,
        receiptNumber,
        paidAt: new Date(),
        handledById,
      },
      include: kitchenOrderInclude,
    });

    return updated;
  });
}

// ---------------------------------------------------------------------------
// Void / Refund Transaction Module
// ---------------------------------------------------------------------------

export interface RefundOrderInput {
  reason: string;
}

/**
 * Reverses a paid order. Admin-only by design (enforced by the API route,
 * not here) — a refund is a financial reversal, not a routine status
 * change, so it's kept out of the same permission tier as marking an order
 * paid or updating the kitchen queue.
 */
export async function refundOrder(orderId: string, input: RefundOrderInput, refundedById: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderError("Order not found.");
  if (order.paymentStatus !== "PAID") {
    throw new OrderError("Only a paid order can be refunded.");
  }
  if (!input.reason || input.reason.trim().length < 3) {
    throw new OrderError("Please provide a reason for the refund.");
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "REFUNDED",
      refundedAmount: order.totalAmount,
      refundReason: input.reason.trim(),
      refundedAt: new Date(),
      refundedById,
    },
    include: kitchenOrderInclude,
  });
}

// ---------------------------------------------------------------------------
// Order History / Sales Inquiry Module
// ---------------------------------------------------------------------------

export interface OrderHistoryFilters {
  search?: string;
  status?: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  channel?: "KIOSK" | "QR";
  paymentStatus?: "UNPAID" | "PAID" | "REFUNDED";
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

/** Admin-facing searchable/filterable archive of every order ever placed —
 * unlike the kitchen queue, this deliberately includes COMPLETED and
 * CANCELLED orders so past transactions can always be looked back up. */
export async function getOrderHistory(filters: OrderHistoryFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(5000, Math.max(1, filters.pageSize ?? 20));

  const where: Prisma.OrderWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.channel ? { channel: filters.channel } : {}),
    ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
    ...(filters.search ? { orderNumber: { contains: filters.search, mode: "insensitive" } } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: kitchenOrderInclude,
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// ---------------------------------------------------------------------------
// Sales Report Module
// ---------------------------------------------------------------------------

export interface SalesReportRange {
  from: Date;
  to: Date;
}

/** Aggregates PAID orders within [from, to] into the numbers a Sales
 * Report screen needs: headline totals, breakdown by channel and by
 * payment method, and a top-sellers list. Only PAID orders count toward
 * revenue — an UNPAID or REFUNDED order never inflates the sales figures. */
export async function getSalesReport({ from, to }: SalesReportRange) {
  const paidWhere: Prisma.OrderWhereInput = {
    paymentStatus: "PAID",
    paidAt: { gte: from, lte: to },
  };

  const [orders, refunded] = await Promise.all([
    prisma.order.findMany({
      where: paidWhere,
      include: {
        items: {
          include: {
            menuItem: { select: { name: true } },
            comboMeal: { select: { name: true } },
          },
        },
      },
    }),
    prisma.order.aggregate({
      where: { paymentStatus: "REFUNDED", refundedAt: { gte: from, lte: to } },
      _sum: { refundedAmount: true },
      _count: true,
    }),
  ]);

  const orderCount = orders.length;
  const grossSales = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const totalTax = orders.reduce((s, o) => s + Number(o.taxAmount), 0);
  const totalServiceCharge = orders.reduce((s, o) => s + Number(o.serviceChargeAmount), 0);
  const totalDiscount = orders.reduce((s, o) => s + Number(o.discountAmount), 0);
  const averageOrderValue = orderCount > 0 ? grossSales / orderCount : 0;

  const byChannel: Record<string, { orderCount: number; total: number }> = { KIOSK: { orderCount: 0, total: 0 }, QR: { orderCount: 0, total: 0 } };
  const byPaymentMethod: Record<string, { orderCount: number; total: number }> = {};
  const byDay: Record<string, number> = {};
  const itemTotals = new Map<string, { name: string; quantity: number; total: number }>();

  for (const order of orders) {
    byChannel[order.channel].orderCount += 1;
    byChannel[order.channel].total += Number(order.totalAmount);

    const method = order.paymentMethod ?? "UNKNOWN";
    if (!byPaymentMethod[method]) byPaymentMethod[method] = { orderCount: 0, total: 0 };
    byPaymentMethod[method].orderCount += 1;
    byPaymentMethod[method].total += Number(order.totalAmount);

    const dayKey = (order.paidAt ?? order.createdAt).toISOString().slice(0, 10);
    byDay[dayKey] = (byDay[dayKey] ?? 0) + Number(order.totalAmount);

    for (const item of order.items) {
      const name = item.menuItem?.name ?? item.comboMeal?.name ?? "Item";
      const key = name;
      const existing = itemTotals.get(key) ?? { name, quantity: 0, total: 0 };
      existing.quantity += item.quantity;
      existing.total += Number(item.subtotal);
      itemTotals.set(key, existing);
    }
  }

  const topItems = [...itemTotals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  const dailyTrend = Object.entries(byDay)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    range: { from, to },
    orderCount,
    grossSales: Math.round(grossSales * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalServiceCharge: Math.round(totalServiceCharge * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    refundedCount: refunded._count,
    refundedTotal: Math.round(Number(refunded._sum.refundedAmount ?? 0) * 100) / 100,
    byChannel,
    byPaymentMethod,
    topItems,
    dailyTrend,
  };
}

// ---------------------------------------------------------------------------
// End-of-Day Cash Reconciliation (Z-Reading) Module
// ---------------------------------------------------------------------------

/** The start of the period a new shift close should cover: right after the
 * last close, or the start of today if this is the first close ever. */
async function getShiftPeriodStart(): Promise<Date> {
  const lastClose = await prisma.shiftClose.findFirst({ orderBy: { periodEnd: "desc" } });
  if (lastClose) return lastClose.periodEnd;

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Snapshots every PAID order since the last close into a permanent
 * ShiftClose (Z-Reading) record — the standard POS/cashiering concept of
 * closing out a shift or a business day with a fixed, unchangeable total. */
export async function closeShift(closedById: string) {
  const periodStart = await getShiftPeriodStart();
  const periodEnd = new Date();

  const orders = await prisma.order.findMany({
    where: { paymentStatus: "PAID", paidAt: { gte: periodStart, lte: periodEnd } },
  });

  if (orders.length === 0) {
    throw new OrderError("There are no paid orders since the last shift close — nothing to close out.");
  }

  const sum = (fn: (o: (typeof orders)[number]) => number) =>
    Math.round(orders.reduce((s, o) => s + fn(o), 0) * 100) / 100;

  const totalByMethod = (method: string) =>
    sum((o) => (o.paymentMethod === method ? Number(o.totalAmount) : 0));

  return prisma.shiftClose.create({
    data: {
      closedById,
      periodStart,
      periodEnd,
      orderCount: orders.length,
      grossSales: sum((o) => Number(o.totalAmount)),
      totalDiscount: sum((o) => Number(o.discountAmount)),
      totalTax: sum((o) => Number(o.taxAmount)),
      totalServiceCharge: sum((o) => Number(o.serviceChargeAmount)),
      netSales: sum((o) => Number(o.totalAmount) - Number(o.taxAmount) - Number(o.serviceChargeAmount)),
      cashTotal: totalByMethod("CASH"),
      gcashTotal: totalByMethod("GCASH"),
      mayaTotal: totalByMethod("MAYA"),
      cardTotal: totalByMethod("CARD"),
    },
  });
}

/** Full detail for one order — used by the Admin Order History detail
 * page. Includes staff/admin names (who handled/refunded it) which the
 * public getOrderStatus deliberately omits. */
export function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          menuItem: { select: { name: true } },
          comboMeal: { select: { name: true } },
          addOns: true,
        },
      },
      table: { select: { tableNumber: true } },
      handledBy: { select: { name: true } },
      refundedBy: { select: { name: true } },
    },
  });
}

export function getShiftCloseHistory(limit = 20) {
  return prisma.shiftClose.findMany({
    orderBy: { periodEnd: "desc" },
    take: limit,
    include: { closedBy: { select: { name: true } } },
  });
}
