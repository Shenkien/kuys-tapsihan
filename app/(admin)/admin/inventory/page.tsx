import { InventoryTable } from "@/components/admin/inventory-table";
import { getLowStockAlert } from "@/lib/dashboard";
import { LowStockAlert } from "@/components/admin/low-stock-alert";

export default async function AdminInventoryPage() {
  const lowStock = await getLowStockAlert();

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Inventory</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track stock levels, restock or deduct quantities, and watch for low-stock items.
      </p>

      {lowStock.length > 0 && (
        <div className="mt-5">
          <LowStockAlert items={lowStock} />
        </div>
      )}

      <div className="mt-6">
        <InventoryTable />
      </div>
    </main>
  );
}
