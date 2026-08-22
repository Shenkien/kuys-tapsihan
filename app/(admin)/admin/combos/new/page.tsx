import { getMenuItems } from "@/lib/menu";
import { serializePrisma } from "@/lib/serialize";
import { ComboForm } from "@/components/admin/combo-form";

export default async function NewComboPage() {
  const menuItems = await getMenuItems();

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">New Combo Meal</h1>
      <p className="mt-1 text-sm text-muted-foreground">Bundle menu items together at a set price.</p>

      <div className="mt-6">
        <ComboForm menuItems={serializePrisma(menuItems).map((m) => ({ id: m.id, name: m.name }))} />
      </div>
    </main>
  );
}
