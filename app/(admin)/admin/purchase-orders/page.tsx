import { getPurchaseOrders } from "@/lib/purchase-orders";
import { serializePrisma } from "@/lib/serialize";
import { PurchaseOrderTable } from "@/components/admin/purchase-order-table";

export default async function AdminPurchaseOrdersPage() {
  const pos = await getPurchaseOrders();
  const serialized = serializePrisma(pos);

  // Client component props cross a real serialization boundary, so this
  // explicitly matches what the browser actually receives — a plain ISO
  // string, not a Date instance — rather than relying on serializePrisma's
  // type (which keeps Date as Date; see lib/serialize.ts).
  const rows = serialized.map((po) => ({ ...po, createdAt: po.createdAt.toISOString() }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Purchase Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Order stock from a supplier and receive it — receiving a PO automatically restocks every
        line item and logs it in the inventory transaction history.
      </p>

      <div className="mt-6">
        <PurchaseOrderTable purchaseOrders={rows} />
      </div>
    </main>
  );
}
