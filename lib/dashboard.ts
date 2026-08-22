import prisma from "@/lib/prisma";

export async function getMenuStats() {
  const [total, available, bestSellers, newItems] = await Promise.all([
    prisma.menuItem.count({ where: { deletedAt: null } }),
    prisma.menuItem.count({ where: { deletedAt: null, isAvailable: true } }),
    prisma.menuItem.count({ where: { deletedAt: null, isBestSeller: true } }),
    prisma.menuItem.count({ where: { deletedAt: null, isNew: true } }),
  ]);
  return { total, available, unavailable: total - available, bestSellers, newItems };
}

export async function getInventoryStats() {
  const [total, lowStock] = await Promise.all([
    prisma.inventoryItem.count(),
    prisma.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT COUNT(*) as count FROM inventory_items WHERE "quantityOnHand" <= "reorderThreshold"`,
  ]);
  return { total, lowStock: Number(lowStock[0]?.count ?? 0) };
}

export async function getLowStockAlert() {
  return prisma.$queryRaw<
    Array<{ id: string; name: string; unit: string; quantityOnHand: number; reorderThreshold: number }>
  >`
    SELECT id, name, unit, "quantityOnHand"::float as "quantityOnHand", "reorderThreshold"::float as "reorderThreshold"
    FROM inventory_items
    WHERE "quantityOnHand" <= "reorderThreshold"
    ORDER BY ("quantityOnHand" - "reorderThreshold") ASC
    LIMIT 10
  `;
}

export async function getRecentOrders(limit = 8) {
  return prisma.order.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { items: true, table: true },
  });
}

export async function getDashboardStats() {
  const [categories, menu, inventory, totalOrders] = await Promise.all([
    prisma.category.count(),
    getMenuStats(),
    getInventoryStats(),
    prisma.order.count(),
  ]);

  return { categories, menu, inventory, totalOrders };
}
