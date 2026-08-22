"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Settings2 } from "lucide-react";

interface Settings {
  vatRate: number;
  vatInclusive: boolean;
  serviceChargeRate: number;
  seniorPwdDiscountRate: number;
  receiptPrefix: string;
  orderingCost: number;
  holdingCostRate: number;
}

export function BusinessSettingsForm() {
  const [values, setValues] = useState<Settings | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setValues);
  }, []);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setValues((v) => (v ? { ...v, [key]: value } : v));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save settings.");
      return;
    }
    setValues(data);
    setSaved(true);
  }

  if (!values) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 font-display font-semibold">
        <Settings2 className="h-4 w-4 text-primary" />
        Tax, Service Charge & Discount Configuration
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">VAT Rate (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={values.vatRate}
            onChange={(e) => set("vatRate", Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Menu prices already include VAT?</label>
          <select
            value={values.vatInclusive ? "yes" : "no"}
            onChange={(e) => set("vatInclusive", e.target.value === "yes")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="yes">Yes — VAT-inclusive</option>
            <option value="no">No — add VAT on top</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Service Charge Rate (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={values.serviceChargeRate}
            onChange={(e) => set("serviceChargeRate", Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Senior/PWD Discount Rate (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={values.seniorPwdDiscountRate}
            onChange={(e) => set("seniorPwdDiscountRate", Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground">RA 9994 / RA 10754 default: 20%</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Official Receipt Prefix</label>
          <input
            value={values.receiptPrefix}
            onChange={(e) => set("receiptPrefix", e.target.value)}
            maxLength={10}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="border-t border-border/60 pt-4">
        <p className="text-sm font-medium">EOQ Suggestion Inputs</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Used to calculate the suggested reorder quantity on the Inventory page.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Ordering Cost per PO (₱)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.orderingCost}
              onChange={(e) => set("orderingCost", Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">Estimated cost to place one purchase order.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Annual Holding Cost Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={values.holdingCostRate}
              onChange={(e) => set("holdingCostRate", Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">% of an item's cost it takes to store 1 unit for a year.</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          Settings saved.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Settings
      </button>
    </form>
  );
}
