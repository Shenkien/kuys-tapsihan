import prisma from "@/lib/prisma";

export interface DailySales {
  date: string; // YYYY-MM-DD
  total: number;
  orderCount: number;
}

export interface SalesForecast {
  history: DailySales[];
  movingAverageWindow: number;
  forecastNextDay: number;
  forecastNext7Days: number;
  trendPercent: number | null; // % change: last 7 days vs the 7 days before that
  bestSellingDayOfWeek: string | null;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * A simple moving-average forecast — deliberately not a fancy ML model.
 * For a small eatery with naturally noisy day-to-day sales, a 7-day moving
 * average of PAID order totals is both easy to explain to a non-technical
 * owner and a legitimate, textbook time-series forecasting method (simple
 * moving average / SMA). Tomorrow's forecast = average of the last 7 days;
 * the trend compares the last 7 days against the 7 days before that.
 */
export async function getSalesForecast(lookbackDays = 30): Promise<SalesForecast> {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  since.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: { paymentStatus: "PAID", paidAt: { gte: since } },
    select: { totalAmount: true, paidAt: true },
  });

  const byDay = new Map<string, { total: number; count: number }>();
  for (const order of orders) {
    const key = order.paidAt!.toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { total: 0, count: 0 };
    entry.total += Number(order.totalAmount);
    entry.count += 1;
    byDay.set(key, entry);
  }

  // Fill in every day in the window, even ones with zero sales, so the
  // moving average isn't skewed by missing (rather than zero) days.
  const history: DailySales[] = [];
  for (let i = lookbackDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = byDay.get(key);
    history.push({ date: key, total: Math.round((entry?.total ?? 0) * 100) / 100, orderCount: entry?.count ?? 0 });
  }

  const window = 7;
  const lastWindow = history.slice(-window);
  const prevWindow = history.slice(-window * 2, -window);

  const avg = (days: DailySales[]) => (days.length ? days.reduce((s, d) => s + d.total, 0) / days.length : 0);

  const forecastNextDay = Math.round(avg(lastWindow) * 100) / 100;
  const forecastNext7Days = Math.round(forecastNextDay * 7 * 100) / 100;

  const prevAvg = avg(prevWindow);
  const trendPercent = prevAvg > 0 ? Math.round(((avg(lastWindow) - prevAvg) / prevAvg) * 1000) / 10 : null;

  // Which weekday tends to sell the most, on average — useful for staffing.
  const byWeekday = new Map<number, { total: number; count: number }>();
  for (const day of history) {
    const weekday = new Date(`${day.date}T00:00:00`).getDay();
    const entry = byWeekday.get(weekday) ?? { total: 0, count: 0 };
    entry.total += day.total;
    entry.count += 1;
    byWeekday.set(weekday, entry);
  }
  let bestSellingDayOfWeek: string | null = null;
  let bestAvg = -1;
  for (const [weekday, entry] of byWeekday) {
    const a = entry.total / entry.count;
    if (a > bestAvg) {
      bestAvg = a;
      bestSellingDayOfWeek = DAY_NAMES[weekday];
    }
  }

  return {
    history,
    movingAverageWindow: window,
    forecastNextDay,
    forecastNext7Days,
    trendPercent,
    bestSellingDayOfWeek: bestAvg > 0 ? bestSellingDayOfWeek : null,
  };
}
