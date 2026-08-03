import prisma from "@/lib/prisma";
import { getAvailableMenuItems, getAvailableAddOns, getAvailableComboMeals } from "@/lib/menu";
import { serializePrisma } from "@/lib/serialize";
import { OrderingExperience } from "@/components/ordering/ordering-experience";
import { LogoLockup } from "@/components/logo";

export default async function QrOrderPage({
  params,
}: {
  params: Promise<{ tableToken: string }>;
}) {
  const { tableToken } = await params;

  const table = await prisma.diningTable.findUnique({ where: { qrCodeToken: tableToken } });

  if (!table || !table.isActive) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <LogoLockup variant="dark" />
        <h1 className="mt-2 font-display text-2xl font-bold">QR Code Not Recognized</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This QR code isn&apos;t active. Please ask a staff member for help, or order at the
          self-service kiosk instead.
        </p>
      </main>
    );
  }

  const [categories, menuItems, addOns, comboMeals] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sortOrder: true },
    }),
    getAvailableMenuItems(),
    getAvailableAddOns(),
    getAvailableComboMeals(),
  ]);

  const categoriesWithItems = categories.filter((c) => menuItems.some((m) => m.categoryId === c.id));

  return (
    <OrderingExperience
      channel="QR"
      tableToken={table.qrCodeToken}
      tableNumber={table.tableNumber}
      categories={categoriesWithItems}
      menuItems={serializePrisma(menuItems)}
      addOns={serializePrisma(addOns)}
      comboMeals={serializePrisma(comboMeals)}
    />
  );
}
