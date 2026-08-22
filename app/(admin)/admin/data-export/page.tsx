import { Download } from "lucide-react";

const EXPORTS = [
  { href: "/api/export/orders", label: "Orders (Sales History)", description: "Every order, its totals, tax, discount, and payment status." },
  { href: "/api/export/inventory", label: "Inventory & Valuation", description: "Current stock levels, unit cost, and total value per item." },
  { href: "/api/export/menu", label: "Menu Items", description: "Menu items, category, price, and availability." },
];

export default function DataExportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Data Export</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Download a CSV snapshot of your data — for backups, or to open in Excel/Google Sheets for
        further analysis.
      </p>

      <div className="mt-6 space-y-3">
        {EXPORTS.map((exp) => (
          <a
            key={exp.href}
            href={exp.href}
            className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40"
          >
            <div>
              <p className="font-medium">{exp.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{exp.description}</p>
            </div>
            <Download className="h-5 w-5 shrink-0 text-primary" />
          </a>
        ))}
      </div>
    </main>
  );
}
