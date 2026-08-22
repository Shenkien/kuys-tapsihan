import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { getSuppliers } from "@/lib/suppliers";
import { getInventoryItems } from "@/lib/inventory";
import { serializePrisma } from "@/lib/serialize";
import { PurchaseOrderForm } from "@/components/admin/purchase-order-form";

export default async function NewPurchaseOrderPage() {
  const [suppliers, inventoryItems] = await Promise.all([getSuppliers(), getInventoryItems()]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">New Purchase Order</h1>
      <p className="mt-1 text-sm text-muted-foreground">Order stock from a supplier.</p>

      {suppliers.length === 0 ? (
        <div className="mt-6 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          You need at least one supplier first —{" "}
          <Link href="/admin/suppliers" className="font-medium underline">
            add one here
          </Link>
          .
        </div>
      ) : (
        <div className="mt-6">
          <PurchaseOrderForm
            suppliers={serializePrisma(suppliers).map((s) => ({ id: s.id, name: s.name }))}
            inventoryItems={serializePrisma(inventoryItems).map((i) => ({
              id: i.id,
              name: i.name,
              unit: i.unit,
              unitCost: i.unitCost,
            }))}
          />
        </div>
      )}
    </main>
  );
}
