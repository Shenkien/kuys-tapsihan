"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ValuationRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantityOnHand: number;
  unitCost: number | null;
  value: number;
  missingCost: boolean;
}

interface Valuation {
  items: ValuationRow[];
  byCategory: { category: string; value: number }[];
  totalValue: number;
  itemsMissingCost: number;
}

export function InventoryValuationView() {
  const [data, setData] = useState<Valuation | null>(null);

  useEffect(() => {
    fetch("/api/reports/inventory-valuation")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Stock Value</p>
          <p className="mt-1 font-display text-3xl font-bold">{formatCurrency(data.totalValue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Value by Category</p>
          <div className="mt-2 space-y-1 text-sm">
            {data.byCategory.map((c) => (
              <div key={c.category} className="flex justify-between">
                <span className="text-muted-foreground">{c.category}</span>
                <span className="font-medium">{formatCurrency(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {data.itemsMissingCost > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {data.itemsMissingCost} item(s) have no unit cost set, so they're valued at ₱0 below —
          add a cost on the Inventory page for an accurate total.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">On Hand</th>
              <th className="px-4 py-3 font-medium">Unit Cost</th>
              <th className="px-4 py-3 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {item.quantityOnHand} {item.unit}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {item.missingCost ? <span className="text-amber-600">Not set</span> : formatCurrency(item.unitCost!)}
                </td>
                <td className="px-4 py-3 font-medium">{formatCurrency(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
