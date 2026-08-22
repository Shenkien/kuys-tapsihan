import { InventoryValuationView } from "@/components/admin/inventory-valuation-view";

export default function InventoryValuationPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Inventory Valuation</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        How much money is currently sitting on the shelf — quantity on hand × unit cost, per item
        and by category.
      </p>

      <div className="mt-6">
        <InventoryValuationView />
      </div>
    </main>
  );
}
