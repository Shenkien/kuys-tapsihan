import prisma from "@/lib/prisma";
import { getAvailableMenuItems, getAvailableAddOns, getAvailableComboMeals } from "@/lib/menu";
import { serializePrisma } from "@/lib/serialize";
import { OrderingExperience } from "@/components/ordering/ordering-experience";

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
