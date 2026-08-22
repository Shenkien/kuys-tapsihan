"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, AlertTriangle } from "lucide-react";

interface EoqRow {
  id: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  reorderThreshold: number;
  avgDailyUsage: number;
  daysUntilStockout: number | null;
  eoq: number | null;
  annualDemand: number;
}

export function EoqSuggestionsView() {
  const [rows, setRows] = useState<EoqRow[] | null>(null);

  useEffect(() => {
    fetch("/api/reports/eoq")
      .then((r) => r.json())
      .then(setRows);
  }, []);

  if (!rows) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const withUsage = rows.filter((r) => r.avgDailyUsage > 0);

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Based on the last 30 days of usage. EOQ (Economic Order Quantity) is the order size that
        minimizes total ordering + storage cost — not just "reorder when low," but "reorder this
        much."
      </p>

      {withUsage.length === 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          No consumption history yet — place a few orders first so usage can be tracked.
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">On Hand</th>
              <th className="px-4 py-3 font-medium">Avg Daily Usage</th>
              <th className="px-4 py-3 font-medium">Days Until Stockout</th>
              <th className="px-4 py-3 font-medium">Suggested Order Qty (EOQ)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.quantityOnHand} {row.unit}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.avgDailyUsage > 0 ? `${row.avgDailyUsage} ${row.unit}/day` : "—"}
                </td>
                <td className="px-4 py-3">
                  {row.daysUntilStockout !== null ? (
                    <span className={row.daysUntilStockout <= 3 ? "font-medium text-destructive" : "text-muted-foreground"}>
                      {row.daysUntilStockout} day(s)
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.eoq !== null ? (
                    <span className="flex items-center gap-1.5 font-medium text-primary">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {row.eoq} {row.unit}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {row.avgDailyUsage === 0 ? "No usage yet" : "Set a unit cost"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
