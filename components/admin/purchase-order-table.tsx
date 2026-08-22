"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface POItem {
  quantityOrdered: number;
  unitCost: number;
}

interface PORow {
  id: string;
  poNumber: string;
  status: "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED";
  createdAt: string;
  supplier: { name: string };
  createdBy: { name: string };
  items: POItem[];
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-secondary text-secondary-foreground",
  ORDERED: "bg-amber-100 text-amber-700",
  RECEIVED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-destructive/10 text-destructive",
};

function poTotal(items: POItem[]) {
  return items.reduce((s, i) => s + i.quantityOrdered * i.unitCost, 0);
}

export function PurchaseOrderTable({ purchaseOrders }: { purchaseOrders: PORow[] }) {
  return (
    <div>
      <div className="flex justify-end">
        <Link
          href="/admin/purchase-orders/new"
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Purchase Order
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">PO #</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Total Cost</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No purchase orders yet — create one to restock from a supplier.
                </td>
              </tr>
            )}
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/purchase-orders/${po.id}`} className="font-medium hover:underline">
                    {po.poNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{po.supplier.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[po.status]}`}>{po.status}</span>
                </td>
                <td className="px-4 py-3 font-medium">{formatCurrency(poTotal(po.items))}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(po.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
