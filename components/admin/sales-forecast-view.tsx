"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Forecast {
  history: { date: string; total: number; orderCount: number }[];
  movingAverageWindow: number;
  forecastNextDay: number;
  forecastNext7Days: number;
  trendPercent: number | null;
  bestSellingDayOfWeek: string | null;
}

export function SalesForecastView() {
  const [data, setData] = useState<Forecast | null>(null);

  useEffect(() => {
    fetch("/api/reports/forecast")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const TrendIcon = data.trendPercent === null ? Minus : data.trendPercent >= 0 ? TrendingUp : TrendingDown;
  const trendColor =
    data.trendPercent === null ? "text-muted-foreground" : data.trendPercent >= 0 ? "text-emerald-600" : "text-destructive";

  const maxDaily = Math.max(1, ...data.history.map((d) => d.total));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 font-display font-semibold">
        <TrendingUp className="h-4 w-4 text-primary" />
        Sales Forecast
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {data.movingAverageWindow}-day moving average, based on the last 30 days of paid orders.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Forecast — Tomorrow</p>
          <p className="mt-1 font-display text-2xl font-bold">{formatCurrency(data.forecastNextDay)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Forecast — Next 7 Days</p>
          <p className="mt-1 font-display text-2xl font-bold">{formatCurrency(data.forecastNext7Days)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Trend (vs prior week)</p>
          <p className={`mt-1 flex items-center gap-1 font-display text-2xl font-bold ${trendColor}`}>
            <TrendIcon className="h-5 w-5" />
            {data.trendPercent !== null ? `${data.trendPercent > 0 ? "+" : ""}${data.trendPercent}%` : "—"}
          </p>
        </div>
      </div>

      {data.bestSellingDayOfWeek && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Historically, <strong className="text-foreground">{data.bestSellingDayOfWeek}</strong> is your best-selling day —
          worth extra staffing/prep.
        </p>
      )}

      <div className="mt-5 space-y-1.5">
        {data.history.slice(-14).map((d) => (
          <div key={d.date} className="flex items-center gap-2 text-xs">
            <span className="w-16 shrink-0 text-muted-foreground">{d.date.slice(5)}</span>
            <div className="h-3 flex-1 overflow-hidden rounded bg-secondary">
              <div className="h-full rounded bg-primary/70" style={{ width: `${Math.max(2, (d.total / maxDaily) * 100)}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right text-muted-foreground">{formatCurrency(d.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
