import { notFound } from "next/navigation";
import { getMenuItems } from "@/lib/menu";
import { getComboMeal } from "@/lib/combos";
import { serializePrisma } from "@/lib/serialize";
import { ComboForm, type ComboFormValues } from "@/components/admin/combo-form";

export default async function EditComboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [menuItems, combo] = await Promise.all([getMenuItems(), getComboMeal(id)]);

  if (!combo) notFound();

  const initialValues: ComboFormValues = {
    id: combo.id,
    name: combo.name,
    description: combo.description ?? "",
    price: Number(combo.price),
    imageUrl: combo.imageUrl ?? "",
    isAvailable: combo.isAvailable,
    items: combo.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Edit Combo Meal</h1>
      <p className="mt-1 text-sm text-muted-foreground">{combo.name}</p>

      <div className="mt-6">
        <ComboForm
          menuItems={serializePrisma(menuItems).map((m) => ({ id: m.id, name: m.name }))}
          initialValues={initialValues}
        />
      </div>
    </main>
  );
}
