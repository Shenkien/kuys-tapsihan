"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, TrendingUp, Receipt, Wallet, Percent, Lock, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { StatsCard } from "@/components/admin/stats-card";

interface SalesReport {
  range: { from: string; to: string };
  orderCount: number;
  grossSales: number;
  totalTax: number;
  totalServiceCharge: number;
  totalDiscount: number;
  averageOrderValue: number;
  refundedCount: number;
  refundedTotal: number;
  byChannel: Record<string, { orderCount: number; total: number }>;
  byPaymentMethod: Record<string, { orderCount: number; total: number }>;
  topItems: { name: string; quantity: number; total: number }[];
  dailyTrend: { date: string; total: number }[];
}

interface ShiftClose {
  id: string;
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  grossSales: number;
  netSales: number;
  cashTotal: number;
  gcashTotal: number;
  mayaTotal: number;
  cardTotal: number;
  closedBy: { name: string };
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function SalesReportView() {
  const today = new Date();
  const weekAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);

  const [from, setFrom] = useState(isoDate(weekAgo));
  const [to, setTo] = useState(isoDate(today));
  const [report, setReport] = useState<SalesReport | null>(null);

  const [closes, setCloses] = useState<ShiftClose[] | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  const loadReport = useCallback(() => {
    setReport(null);
    fetch(`/api/reports/sales?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then(setReport);
  }, [from, to]);

  const loadCloses = useCallback(() => {
    fetch("/api/reports/shift-close")
      .then((r) => r.json())
      .then((data) => setCloses(data.closes));
  }, []);

  useEffect(loadReport, [loadReport]);
  useEffect(loadCloses, [loadCloses]);

  async function handleCloseShift() {
    if (!confirm("Close the shift now? This snapshots every paid order since the last close and can't be undone.")) return;
    setClosing(true);
    setCloseError(null);
    const res = await fetch("/api/reports/shift-close", { method: "POST" });
    const data = await res.json();
    setClosing(false);
    if (!res.ok) {
      setCloseError(data.error ?? "Could not close the shift.");
      return;
    }
    loadCloses();
    loadReport();
  }

  const maxDaily = report ? Math.max(1, ...report.dailyTrend.map((d) => d.total)) : 1;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {report === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard label="Gross Sales" value={formatCurrency(report.grossSales)} icon={Wallet} hint={`${report.orderCount} paid orders`} />
            <StatsCard label="Avg Order Value" value={formatCurrency(report.averageOrderValue)} icon={TrendingUp} />
            <StatsCard label="Total Discounts" value={formatCurrency(report.totalDiscount)} icon={Percent} />
            <StatsCard
              label="Refunds"
              value={formatCurrency(report.refundedTotal)}
              icon={Receipt}
              hint={`${report.refundedCount} refunded order${report.refundedCount === 1 ? "" : "s"}`}
              tone={report.refundedCount > 0 ? "warning" : "default"}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display font-semibold">Sales by Channel (dual-channel comparison)</h3>
              <div className="mt-3 space-y-2 text-sm">
                {Object.entries(report.byChannel).map(([channel, data]) => (
                  <div key={channel} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                    <span>{channel === "KIOSK" ? "Kiosk (dine-in)" : "QR order"}</span>
                    <span className="text-muted-foreground">{data.orderCount} orders</span>
                    <span className="font-medium">{formatCurrency(data.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display font-semibold">Sales by Payment Method</h3>
              <div className="mt-3 space-y-2 text-sm">
                {Object.entries(report.byPaymentMethod).length === 0 && (
                  <p className="text-muted-foreground">No paid orders in this range.</p>
                )}
                {Object.entries(report.byPaymentMethod).map(([method, data]) => (
                  <div key={method} className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
                    <span>{method}</span>
                    <span className="text-muted-foreground">{data.orderCount} orders</span>
                    <span className="font-medium">{formatCurrency(data.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Best Sellers</h3>
            <div className="mt-3 space-y-2">
              {report.topItems.length === 0 && <p className="text-sm text-muted-foreground">No paid orders in this range.</p>}
              {report.topItems.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-xs text-muted-foreground">#{i + 1}</span>
                  <span className="flex-1 font-medium">{item.name}</span>
                  <span className="text-muted-foreground">{item.quantity} sold</span>
                  <span className="w-20 text-right font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-semibold">Daily Trend</h3>
            <div className="mt-4 space-y-2">
              {report.dailyTrend.length === 0 && <p className="text-sm text-muted-foreground">No paid orders in this range.</p>}
              {report.dailyTrend.map((d) => (
                <div key={d.date} className="flex items-center gap-3 text-xs">
                  <span className="w-20 shrink-0 text-muted-foreground">{d.date}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-secondary">
                    <div
                      className="h-full rounded bg-primary"
                      style={{ width: `${Math.max(4, (d.total / maxDaily) * 100)}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right font-medium">{formatCurrency(d.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold">End-of-Day Cash Reconciliation (Z-Reading)</h3>
          </div>
          <button
            onClick={handleCloseShift}
            disabled={closing}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {closing && <Loader2 className="h-4 w-4 animate-spin" />}
            Close Shift Now
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Snapshots every paid order since the last close into a permanent, unchangeable record —
          the standard cashiering "Z-read" used to reconcile the till at the end of a shift or day.
        </p>
        {closeError && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {closeError}
          </p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Period</th>
                <th className="py-2 pr-4 font-medium">Orders</th>
                <th className="py-2 pr-4 font-medium">Gross</th>
                <th className="py-2 pr-4 font-medium">Cash</th>
                <th className="py-2 pr-4 font-medium">GCash</th>
                <th className="py-2 pr-4 font-medium">Maya</th>
                <th className="py-2 pr-4 font-medium">Card</th>
                <th className="py-2 pr-4 font-medium">Closed by</th>
              </tr>
            </thead>
            <tbody>
              {closes === null && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  </td>
                </tr>
              )}
              {closes?.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-muted-foreground">
                    No shifts closed yet.
                  </td>
                </tr>
              )}
              {closes?.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-4 text-xs text-muted-foreground">
                    {new Date(c.periodStart).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })} –{" "}
                    {new Date(c.periodEnd).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="py-2 pr-4">{c.orderCount}</td>
                  <td className="py-2 pr-4 font-medium">{formatCurrency(c.grossSales)}</td>
                  <td className="py-2 pr-4">{formatCurrency(c.cashTotal)}</td>
                  <td className="py-2 pr-4">{formatCurrency(c.gcashTotal)}</td>
                  <td className="py-2 pr-4">{formatCurrency(c.mayaTotal)}</td>
                  <td className="py-2 pr-4">{formatCurrency(c.cardTotal)}</td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{c.closedBy.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
