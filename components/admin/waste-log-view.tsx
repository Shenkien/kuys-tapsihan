"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Trash2 } from "lucide-react";

interface InventoryOption {
  id: string;
  name: string;
  unit: string;
  quantityOnHand: number;
}

interface WasteLogEntry {
  id: string;
  quantity: number;
  note: string | null;
  createdAt: string;
  inventoryItem: { name: string; unit: string };
}

const REASONS = [
  { value: "WASTE", label: "Waste (dropped, over-prepped, etc.)" },
  { value: "SPOILAGE", label: "Spoilage (expired, gone bad)" },
  { value: "RECOUNT", label: "Recount / correction" },
  { value: "OTHER", label: "Other" },
] as const;

export function WasteLogView({ inventoryItems }: { inventoryItems: InventoryOption[] }) {
  const [itemId, setItemId] = useState(inventoryItems[0]?.id ?? "");
  const [quantity, setQuantity] = useState<number | "">("");
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("WASTE");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [log, setLog] = useState<WasteLogEntry[] | null>(null);

  function loadLog() {
    fetch("/api/inventory/waste-log")
      .then((r) => r.json())
      .then(setLog);
  }

  useEffect(loadLog, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId || quantity === "" || Number(quantity) <= 0) {
      setError("Choose an item and enter a quantity greater than 0.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/inventory/waste-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventoryItemId: itemId, quantity: Number(quantity), reason, details }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Could not log this entry.");
      return;
    }

    setQuantity("");
    setDetails("");
    loadLog();
  }

  const selectedItem = inventoryItems.find((i) => i.id === itemId);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 font-display font-semibold">
          <Trash2 className="h-4 w-4 text-destructive" />
          Log Waste / Spoilage
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Item</label>
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {inventoryItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.quantityOnHand} {item.unit} on hand)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Quantity {selectedItem ? `(${selectedItem.unit})` : ""}
          </label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as typeof reason)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Details (optional)</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            placeholder="e.g. left out overnight, fridge issue…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Log Entry
        </button>
      </form>

      <div>
        <h3 className="mb-3 font-display font-semibold">Recent Entries</h3>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Note</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {log === null && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}
              {log?.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No waste/spoilage logged yet.
                  </td>
                </tr>
              )}
              {log?.map((entry) => (
                <tr key={entry.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{entry.inventoryItem.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    -{entry.quantity} {entry.inventoryItem.unit}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{entry.note || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
