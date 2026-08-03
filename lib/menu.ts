import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const menuItemInclude = {
  category: true,
  ingredients: { include: { inventoryItem: true } },
} satisfies Prisma.MenuItemInclude;

export function getMenuItems() {
  return prisma.menuItem.findMany({
    where: { deletedAt: null },
    include: menuItemInclude,
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export function getMenuItem(id: string) {
  return prisma.menuItem.findUnique({
    where: { id },
    include: menuItemInclude,
  });
}

export function getMenuItemsByCategory(categoryId: string) {
  return prisma.menuItem.findMany({
    where: { categoryId, deletedAt: null },
    include: menuItemInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/**
 * Customer-facing menu: only items that are actually orderable right now.
 * Used by the kiosk and QR ordering pages — never expose unavailable/
 * soft-deleted items or internal-only fields (recipe/cost data) here.
 */
export function getAvailableMenuItems() {
  return prisma.menuItem.findMany({
    where: { deletedAt: null, isAvailable: true },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      imageUrl: true,
      isBestSeller: true,
      isNew: true,
      categoryId: true,
      category: { select: { id: true, name: true, sortOrder: true } },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

/** Global add-on catalog shown alongside every item on the kiosk/QR menu. */
export function getAvailableAddOns() {
  return prisma.addOn.findMany({
    where: { isAvailable: true },
    select: { id: true, name: true, price: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/**
 * Combo meals ready to sell — only combos where every included item is
 * still available are shown, so a combo never advertises something the
 * kitchen can't actually make.
 */
export async function getAvailableComboMeals() {
  const combos = await prisma.comboMeal.findMany({
    where: { isAvailable: true },
    include: {
      items: {
        include: { menuItem: { select: { id: true, name: true, price: true, isAvailable: true, deletedAt: true } } },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return combos.filter((combo) => combo.items.every((i) => i.menuItem.isAvailable && !i.menuItem.deletedAt));
}

export interface MenuItemInput {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  isAvailable?: boolean;
  isBestSeller?: boolean;
  isNew?: boolean;
  sortOrder?: number;
}

export function createMenuItem(data: MenuItemInput) {
  return prisma.menuItem.create({
    data: {
      name: data.name,
      description: data.description || null,
      price: data.price,
      categoryId: data.categoryId,
      imageUrl: data.imageUrl || null,
      isAvailable: data.isAvailable ?? true,
      isBestSeller: data.isBestSeller ?? false,
      isNew: data.isNew ?? false,
      sortOrder: data.sortOrder ?? 0,
    },
    include: menuItemInclude,
  });
}

export function updateMenuItem(id: string, data: Partial<MenuItemInput>) {
  return prisma.menuItem.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
      ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      ...(data.isBestSeller !== undefined && { isBestSeller: data.isBestSeller }),
      ...(data.isNew !== undefined && { isNew: data.isNew }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
    include: menuItemInclude,
  });
}

/**
 * If the item has order history, hard-deleting would break past receipts/
 * reports, so it's soft-deleted (hidden + marked unavailable) instead. Items
 * that were never ordered are safe to remove permanently.
 */
export async function deleteMenuItem(id: string) {
  const orderCount = await prisma.orderItem.count({ where: { menuItemId: id } });

  if (orderCount > 0) {
    return {
      mode: "soft" as const,
      item: await prisma.menuItem.update({
        where: { id },
        data: { deletedAt: new Date(), isAvailable: false },
      }),
    };
  }

  await prisma.menuItemIngredient.deleteMany({ where: { menuItemId: id } });
  return { mode: "hard" as const, item: await prisma.menuItem.delete({ where: { id } }) };
}

export function toggleAvailability(id: string, isAvailable: boolean) {
  return prisma.menuItem.update({ where: { id }, data: { isAvailable } });
}

export function toggleBestSeller(id: string, isBestSeller: boolean) {
  return prisma.menuItem.update({ where: { id }, data: { isBestSeller } });
}

export function toggleNew(id: string, isNew: boolean) {
  return prisma.menuItem.update({ where: { id }, data: { isNew } });
}

export function searchMenuItems(query: string) {
  return prisma.menuItem.findMany({
    where: {
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    include: menuItemInclude,
    orderBy: { name: "asc" },
  });
}

export interface MenuItemFilter {
  categoryId?: string;
  status?: "available" | "unavailable" | "best_seller" | "new";
}

export function filterMenuItems({ categoryId, status }: MenuItemFilter) {
  return prisma.menuItem.findMany({
    where: {
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(status === "available" && { isAvailable: true }),
      ...(status === "unavailable" && { isAvailable: false }),
      ...(status === "best_seller" && { isBestSeller: true }),
      ...(status === "new" && { isNew: true }),
    },
    include: menuItemInclude,
    orderBy: { name: "asc" },
  });
}
