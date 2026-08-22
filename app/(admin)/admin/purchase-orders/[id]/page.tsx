import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPurchaseOrder } from "@/lib/purchase-orders";
import { serializePrisma } from "@/lib/serialize";
import { formatCurrency } from "@/lib/utils";
import { PurchaseOrderActions } from "@/components/admin/purchase-order-actions";

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-secondary text-secondary-foreground",
  ORDERED: "bg-amber-100 text-amber-700",
  RECEIVED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poRaw = await getPurchaseOrder(id);
  if (!poRaw) notFound();

  const po = serializePrisma(poRaw);
  const total = po.items.reduce((s, i) => s + i.quantityOrdered * i.unitCost, 0);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/admin/purchase-orders" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Purchase Orders
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{po.poNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {po.supplier.name} · Created by {po.createdBy.name}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_TONE[po.status]}`}>{po.status}</span>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-display font-semibold">Line Items</h2>
        <div className="mt-3 space-y-2">
          {po.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.quantityOrdered} {item.inventoryItem.unit} — {item.inventoryItem.name}
              </span>
              <span className="text-muted-foreground">
                {formatCurrency(item.unitCost)}/unit = {formatCurrency(item.quantityOrdered * item.unitCost)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-border/60 pt-3 font-display font-bold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>

        {po.notes && (
          <p className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">Notes: {po.notes}</p>
        )}

        <div className="mt-3 space-y-0.5 text-xs text-muted-foreground">
          {po.orderedAt && <p>Ordered: {new Date(po.orderedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</p>}
          {po.receivedAt && <p>Received: {new Date(po.receivedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</p>}
        </div>
      </div>

      {po.status === "RECEIVED" ? (
        <p className="mt-6 text-sm text-muted-foreground">
          This PO has been received — its items were automatically restocked in Inventory.
        </p>
      ) : po.status === "CANCELLED" ? (
        <p className="mt-6 text-sm text-muted-foreground">This PO was cancelled.</p>
      ) : (
        <div className="mt-6">
          <PurchaseOrderActions id={po.id} status={po.status} />
        </div>
      )}
    </main>
  );
}
