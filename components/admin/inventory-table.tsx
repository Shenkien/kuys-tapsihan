"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Loader2, AlertTriangle, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InventoryForm } from "@/components/admin/inventory-form";

interface InventoryRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantityOnHand: number;
  reorderThreshold: number;
  unitCost: number | null;
}

function StockAction({ id, onDone }: { id: string; onDone: () => void }) {
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState<"restock" | "deduct" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "restock" | "deduct") {
    const n = Number(qty);
    if (!qty || n <= 0) return;
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/inventory/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, quantity: n }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Failed.");
      return;
    }
    setQty("");
    onDone();
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min="0"
        step="0.001"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="Qty"
        className="w-20 rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        onClick={() => run("restock")}
        disabled={busy !== null}
        title="Restock"
        className="rounded-md p-1.5 text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
      >
        {busy === "restock" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
      </button>
      <button
        onClick={() => run("deduct")}
        disabled={busy !== null}
        title="Deduct"
        className="rounded-md p-1.5 text-amber-600 transition hover:bg-amber-50 disabled:opacity-50"
      >
        {busy === "deduct" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownCircle className="h-4 w-4" />}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export function InventoryTable() {
  const [items, setItems] = useState<InventoryRow[] | null>(null);
  const [category, setCategory] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = category ? `?category=${encodeURIComponent(category)}` : "";
    fetch(`/api/inventory${params}`)
      .then((r) => r.json())
      .then(setItems);
  }, [category]);

  useEffect(load, [load]);

  const categories = Array.from(new Set((items ?? []).map((i) => i.category))).sort();

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}" from inventory?`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) load();
    else alert("Could not delete — this item may still be used in a recipe.");
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      {showAddForm && (
        <div className="mt-4">
          <InventoryForm
            onSaved={() => {
              setShowAddForm(false);
              load();
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">On Hand</th>
              <th className="px-4 py-3 font-medium">Reorder At</th>
              <th className="px-4 py-3 font-medium">Stock Action</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {items?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No inventory items yet.
                </td>
              </tr>
            )}
            {items?.map((item) => {
              const low = item.quantityOnHand <= item.reorderThreshold;
              return (
                <tr key={item.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/inventory/${item.id}`} className="font-medium hover:underline">
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                  <td className={cn("px-4 py-3 font-medium", low && "text-destructive")}>
                    <span className="flex items-center gap-1.5">
                      {low && <AlertTriangle className="h-3.5 w-3.5" />}
                      {item.quantityOnHand} {item.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.reorderThreshold} {item.unit}
                  </td>
                  <td className="px-4 py-3">
                    <StockAction id={item.id} onDone={load} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        disabled={deletingId === item.id}
                        className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        aria-label="Delete"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
