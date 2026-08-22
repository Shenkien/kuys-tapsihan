import { CategoryManager } from "@/components/admin/category-manager";
import { getCategories } from "@/lib/categories";
import { serializePrisma } from "@/lib/serialize";

export default async function AdminCategoriesPage() {
  const categories = serializePrisma(await getCategories());

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Categories</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Organize the menu into sections like Silog Meals or Beverages. A category can only be
        deleted once it has no items left in it.
      </p>

      <div className="mt-6">
        <CategoryManager initialCategories={categories} />
      </div>
    </main>
  );
}
