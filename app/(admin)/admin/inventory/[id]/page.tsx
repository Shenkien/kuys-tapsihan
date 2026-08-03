import { notFound } from "next/navigation";
import Link from "next/link";
import { getInventoryItem } from "@/lib/inventory";
import { serializePrisma } from "@/lib/serialize";
import { InventoryEditPanel } from "@/components/admin/inventory-edit-panel";

export default async function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getInventoryItem(id);
  if (!item) notFound();

  const initialValues = serializePrisma({
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantityOnHand: item.quantityOnHand,
    reorderThreshold: item.reorderThreshold,
    unitCost: item.unitCost ?? "",
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Edit Inventory Item</h1>
      <p className="mt-1 text-sm text-muted-foreground">{item.name}</p>

      <div className="mt-6">
        <InventoryEditPanel initialValues={initialValues} />
      </div>

      <div className="mt-8">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Used In
        </h2>
        {item.usedIn.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Not linked to any recipe yet.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
            {item.usedIn.map((usage) => (
              <li key={usage.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <Link href={`/admin/recipes?menuItemId=${usage.menuItemId}`} className="font-medium hover:underline">
                  {usage.menuItem.name}
                </Link>
                <span className="text-muted-foreground">
                  {Number(usage.quantityUsed)} {item.unit} per order
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
