import { SalesReportView } from "@/components/admin/sales-report-view";
import { SalesForecastView } from "@/components/admin/sales-forecast-view";

export default function AdminReportsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Sales Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Revenue, best sellers, channel and payment-method breakdowns, and end-of-day cash
        reconciliation — pick a date range to get started.
      </p>

      <div className="mt-6">
        <SalesForecastView />
      </div>

      <div className="mt-6">
        <SalesReportView />
      </div>
    </main>
  );
}
