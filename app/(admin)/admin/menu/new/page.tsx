import { MenuForm } from "@/components/admin/menu-form";
import { getCategories } from "@/lib/categories";
import { serializePrisma } from "@/lib/serialize";

export default async function NewMenuItemPage() {
  const categories = serializePrisma(await getCategories());

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">New Menu Item</h1>
      <p className="mt-1 text-sm text-muted-foreground">Add a new item to the menu.</p>

      <div className="mt-6">
        <MenuForm categories={categories} />
      </div>
    </main>
  );
}
