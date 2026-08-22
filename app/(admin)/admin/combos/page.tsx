import { getComboMeals } from "@/lib/combos";
import { serializePrisma } from "@/lib/serialize";
import { ComboTable } from "@/components/admin/combo-table";

export default async function AdminCombosPage() {
  const combos = await getComboMeals();

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Combo Meals</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Bundle menu items together at a set price — e.g. "Tapsilog + Drink Combo".
      </p>

      <div className="mt-6">
        <ComboTable initialCombos={serializePrisma(combos)} />
      </div>
    </main>
  );
}
