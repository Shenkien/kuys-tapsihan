import prisma from "@/lib/prisma";
import { getAvailableMenuItems, getAvailableAddOns, getAvailableComboMeals } from "@/lib/menu";
import { serializePrisma } from "@/lib/serialize";
import { OrderingExperience } from "@/components/ordering/ordering-experience";

// Forces this page to render per-request instead of being statically
// prerendered at build time. Two reasons: (1) it depends on the database,
// which isn't reachable during a Vercel build unless DATABASE_URL happens
// to be set there too, and (2) even if it were, a static build-time
// snapshot of the menu would go stale the moment an admin changes an
// item's price or availability — this is a live ordering screen, not
// marketing content.
export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const [categories, menuItems, addOns, comboMeals] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sortOrder: true },
    }),
    getAvailableMenuItems(),
    getAvailableAddOns(),
    getAvailableComboMeals(),
  ]);

  // Only show categories that actually have at least one orderable item.
  const categoriesWithItems = categories.filter((c) => menuItems.some((m) => m.categoryId === c.id));

  return (
    <OrderingExperience
      channel="KIOSK"
      categories={categoriesWithItems}
      menuItems={serializePrisma(menuItems)}
      addOns={serializePrisma(addOns)}
      comboMeals={serializePrisma(comboMeals)}
    />
  );
}
