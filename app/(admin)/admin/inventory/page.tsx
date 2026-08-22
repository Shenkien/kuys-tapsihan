import Link from "next/link";
import { Trash2, Calculator, TrendingUp } from "lucide-react";
import { InventoryTable } from "@/components/admin/inventory-table";
import { getLowStockAlert } from "@/lib/dashboard";
import { LowStockAlert } from "@/components/admin/low-stock-alert";

export default async function AdminInventoryPage() {
  const lowStock = await getLowStockAlert();

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track stock levels, restock or deduct quantities, and watch for low-stock items.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/inventory/waste-log"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:bg-secondary"
          >
            <Trash2 className="h-4 w-4" />
            Waste Log
          </Link>
          <Link
            href="/admin/inventory/valuation"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:bg-secondary"
          >
            <Calculator className="h-4 w-4" />
            Valuation
          </Link>
          <Link
            href="/admin/inventory/eoq"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:bg-secondary"
          >
            <TrendingUp className="h-4 w-4" />
            Reorder Suggestions
          </Link>
        </div>
      </div>

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
