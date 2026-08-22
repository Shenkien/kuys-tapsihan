import { notFound } from "next/navigation";
import { MenuForm, type MenuFormValues } from "@/components/admin/menu-form";
import { getCategories } from "@/lib/categories";
import { getMenuItem } from "@/lib/menu";
import { serializePrisma } from "@/lib/serialize";

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [categories, item] = await Promise.all([getCategories(), getMenuItem(id)]);

  if (!item) notFound();

  const initialValues: MenuFormValues = {
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    price: Number(item.price),
    categoryId: item.categoryId,
    imageUrl: item.imageUrl ?? "",
    isAvailable: item.isAvailable,
    isBestSeller: item.isBestSeller,
    isNew: item.isNew,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Edit Menu Item</h1>
      <p className="mt-1 text-sm text-muted-foreground">{item.name}</p>

      <div className="mt-6">
        <MenuForm categories={serializePrisma(categories)} initialValues={initialValues} />
      </div>
    </main>
  );
}
