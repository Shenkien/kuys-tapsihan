import prisma from "@/lib/prisma";

export function getComboMeals() {
  return prisma.comboMeal.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { items: { include: { menuItem: { select: { id: true, name: true } } } } },
  });
}

export function getComboMeal(id: string) {
  return prisma.comboMeal.findUnique({
    where: { id },
    include: { items: { include: { menuItem: { select: { id: true, name: true } } } } },
  });
}

export interface ComboMealInput {
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  isAvailable?: boolean;
  sortOrder?: number;
  items: { menuItemId: string; quantity: number }[];
}

export function createComboMeal(data: ComboMealInput) {
  return prisma.comboMeal.create({
    data: {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      price: data.price,
      isAvailable: data.isAvailable ?? true,
      sortOrder: data.sortOrder ?? 0,
      items: {
        create: data.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      },
    },
    include: { items: true },
  });
}

/** Replaces the combo's item list wholesale (delete-then-recreate) rather
 * than diffing — simplest correct approach for a handful of rows, and the
 * combo's own id never changes so past OrderItems (which snapshot price,
 * not the item list) are unaffected. */
export function updateComboMeal(id: string, data: Partial<ComboMealInput>) {
  return prisma.$transaction(async (tx) => {
    if (data.items) {
      await tx.comboMealItem.deleteMany({ where: { comboMealId: id } });
    }

    return tx.comboMeal.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl?.trim() || null }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.items && {
          items: { create: data.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })) },
        }),
      },
      include: { items: true },
    });
  });
}

/** Refuses to hard-delete a combo that's already been ordered (OrderItem
 * snapshots reference it directly, unlike add-ons) — mark it unavailable
 * instead so it disappears from the ordering screen but past receipts
 * still resolve correctly. */
export async function deleteComboMeal(id: string) {
  const orderItemCount = await prisma.orderItem.count({ where: { comboMealId: id } });
  if (orderItemCount > 0) {
    return { ok: false as const, orderItemCount };
  }

  await prisma.comboMeal.delete({ where: { id } });
  return { ok: true as const };
}
