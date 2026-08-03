import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
        const totalAmount = subtotal; // no tax/service charge modeled yet

        const orderNumber = await generateOrderNumber(tx);

        const order = await tx.order.create({
          data: {
            orderNumber,
            channel: input.channel,
            tableId: input.tableId || null,
            customerName: input.customerName?.trim() || null,
            paymentMethod: input.paymentMethod ?? null,
            subtotal,
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
    where: { status: { in: ["PENDING", "CONFIRMED"] } },
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
  CONFIRMED: ["COMPLETED", "CANCELLED"],
};

/**
 * Drives an order forward through the kitchen queue.
 *  - PENDING -> CONFIRMED ("RECEIVE"): staff has accepted it and the
 *    kitchen slip is about to print. Stamps `printedAt`.
 *  - CONFIRMED -> COMPLETED ("COMPLETE"): food handed to the customer.
 *  - either -> CANCELLED: reverses every DEDUCTION this order made, in the
 *    same transaction, by writing offsetting RETURN transactions and
 *    restoring `quantityOnHand` — so a cancelled order never leaves
 *    inventory permanently short.
 */
export async function updateOrderStatus(
  orderId: string,
  nextStatus: "CONFIRMED" | "COMPLETED" | "CANCELLED",
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
