import prisma from "@/lib/prisma";

export function getCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { menuItems: { where: { deletedAt: null } } } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function getCategory(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { menuItems: { where: { deletedAt: null } } } } },
  });
}

export interface CategoryInput {
  name: string;
  sortOrder?: number;
}

export function createCategory(data: CategoryInput) {
  return prisma.category.create({
    data: { name: data.name, sortOrder: data.sortOrder ?? 0 },
  });
}

export function updateCategory(id: string, data: Partial<CategoryInput>) {
  return prisma.category.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });
}

/** Refuses to delete a category that still has (non-deleted) menu items linked. */
export async function deleteCategory(id: string) {
  const itemCount = await prisma.menuItem.count({
    where: { categoryId: id, deletedAt: null },
  });

  if (itemCount > 0) {
    return { ok: false as const, itemCount };
  }

  await prisma.category.delete({ where: { id } });
  return { ok: true as const };
}

export function getCategoryItems(id: string) {
  return prisma.menuItem.findMany({
    where: { categoryId: id, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
