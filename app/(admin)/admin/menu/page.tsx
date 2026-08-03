import { MenuTable } from "@/components/admin/menu-table";
import { getCategories } from "@/lib/categories";
import { serializePrisma } from "@/lib/serialize";

export default async function AdminMenuPage() {
  const categories = serializePrisma(await getCategories());

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Menu Management</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Search, filter, and manage every item on the menu.
      </p>

      <div className="mt-6">
        <MenuTable categories={categories} />
      </div>
    </main>
  );
}
