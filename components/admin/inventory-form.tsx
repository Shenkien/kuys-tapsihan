"use client";

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";

export interface InventoryFormValues {
  id?: string;
  name: string;
  category: string;
  unit: string;
  quantityOnHand: number | "";
  reorderThreshold: number | "";
  unitCost: number | "";
}

const emptyValues: InventoryFormValues = {
  name: "",
  category: "Uncategorized",
  unit: "",
  quantityOnHand: 0,
  reorderThreshold: 0,
  unitCost: "",
};

export function InventoryForm({
  initialValues,
  onSaved,
  onCancel,
}: {
  initialValues?: InventoryFormValues;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const isEdit = Boolean(initialValues?.id);
  const [values, setValues] = useState<InventoryFormValues>(initialValues ?? emptyValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof InventoryFormValues>(key: K, value: InventoryFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.name.trim() || !values.unit.trim()) {
      setError("Name and unit are required.");
      return;
    }

    setSubmitting(true);
    const payload = {
      name: values.name.trim(),
      category: values.category.trim() || "Uncategorized",
      unit: values.unit.trim(),
      quantityOnHand: values.quantityOnHand === "" ? 0 : Number(values.quantityOnHand),
      reorderThreshold: values.reorderThreshold === "" ? 0 : Number(values.reorderThreshold),
      unitCost: values.unitCost === "" ? undefined : Number(values.unitCost),
    };

    const res = await fetch(isEdit ? `/api/inventory/${values.id}` : "/api/inventory", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Could not save inventory item.");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <input
            value={values.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="Meat, Produce, Dry Goods…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Unit</label>
          <input
            value={values.unit}
            onChange={(e) => set("unit", e.target.value)}
            placeholder="kg, pcs, cup…"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Unit Cost (₱, optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.unitCost}
            onChange={(e) => set("unitCost", e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            {isEdit ? "Quantity on Hand" : "Starting Quantity"}
          </label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={values.quantityOnHand}
            onChange={(e) => set("quantityOnHand", e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {isEdit && (
            <p className="mt-1 text-xs text-muted-foreground">
              For routine stock changes, use Restock/Deduct on the list instead — they keep an
              audit trail. This field overwrites the count directly.
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Reorder Threshold</label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={values.reorderThreshold}
            onChange={(e) => set("reorderThreshold", e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Add Item"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-secondary"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
