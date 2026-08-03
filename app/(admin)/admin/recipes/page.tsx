import { Suspense } from "react";
import { RecipeManager } from "@/components/admin/recipe-manager";
import { getMenuItems } from "@/lib/menu";
import { getInventoryItems } from "@/lib/inventory";
import { serializePrisma } from "@/lib/serialize";

export default async function AdminRecipesPage() {
  const [menuItems, inventoryItems] = await Promise.all([getMenuItems(), getInventoryItems()]);

  const menuItemOptions = serializePrisma(
    menuItems.map((m) => ({ id: m.id, name: m.name, category: { name: m.category.name } }))
  );
  const inventoryItemOptions = serializePrisma(
    inventoryItems.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Recipes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Link each menu item to the ingredients (and quantities) it consumes per order. This
        powers cost calculation and automatic inventory deduction when orders are placed.
      </p>

      <div className="mt-6">
        {menuItemOptions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Add a menu item first, then come back here to build its recipe.
          </p>
        ) : inventoryItemOptions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Add some inventory items first, then come back here to build recipes.
          </p>
        ) : (
          <Suspense fallback={null}>
            <RecipeManager menuItems={menuItemOptions} inventoryItems={inventoryItemOptions} />
          </Suspense>
        )}
      </div>
    </main>
  );
}
