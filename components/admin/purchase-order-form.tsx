"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface SupplierOption {
  id: string;
  name: string;
}

interface InventoryOption {
  id: string;
  name: string;
  unit: string;
  unitCost: number | null;
}

interface Line {
  inventoryItemId: string;
  quantityOrdered: number | "";
  unitCost: number | "";
}

export function PurchaseOrderForm({
  suppliers,
  inventoryItems,
}: {
  suppliers: SupplierOption[];
  inventoryItems: InventoryOption[];
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLine() {
    if (inventoryItems.length === 0) return;
    const first = inventoryItems[0];
    setLines((l) => [...l, { inventoryItemId: first.id, quantityOrdered: "", unitCost: first.unitCost ?? "" }]);
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((l) => l.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function removeLine(index: number) {
    setLines((l) => l.filter((_, i) => i !== index));
  }

  function handleItemChange(index: number, inventoryItemId: string) {
    const item = inventoryItems.find((i) => i.id === inventoryItemId);
    updateLine(index, { inventoryItemId, unitCost: item?.unitCost ?? "" });
  }

  const total = lines.reduce((s, l) => s + Number(l.quantityOrdered || 0) * Number(l.unitCost || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError("Choose a supplier.");
      return;
    }
    if (lines.length === 0 || lines.some((l) => !l.quantityOrdered || l.unitCost === "")) {
      setError("Add at least one line item with a quantity and cost.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          notes,
          items: lines.map((l) => ({
            inventoryItemId: l.inventoryItemId,
            quantityOrdered: Number(l.quantityOrdered),
            unitCost: Number(l.unitCost),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create purchase order.");
      router.push(`/admin/purchase-orders/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create purchase order.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Supplier</label>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {suppliers.length === 0 && <option value="">No suppliers yet — add one first</option>}
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium">Line items</label>
          <button
            type="button"
            onClick={addLine}
            disabled={inventoryItems.length === 0}
            className="flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs font-medium transition hover:bg-secondary disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          {lines.length === 0 && <p className="py-2 text-center text-sm text-muted-foreground">No items yet — add one above.</p>}
          {lines.map((line, index) => {
            const item = inventoryItems.find((i) => i.id === line.inventoryItemId);
            return (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={line.inventoryItemId}
                  onChange={(e) => handleItemChange(index, e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {inventoryItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={line.quantityOrdered}
                  onChange={(e) => updateLine(index, { quantityOrdered: e.target.value === "" ? "" : Number(e.target.value) })}
                  placeholder={item?.unit ?? "qty"}
                  className="w-24 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitCost}
                  onChange={(e) => updateLine(index, { unitCost: e.target.value === "" ? "" : Number(e.target.value) })}
                  placeholder="cost/unit"
                  className="w-24 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {lines.length > 0 && (
          <p className="mt-2 text-right text-sm font-medium">Estimated total: {formatCurrency(total)}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
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
        className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Create Purchase Order
      </button>
    </form>
  );
}
