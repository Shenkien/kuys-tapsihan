"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AddOnRow {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
}

export function AddOnManager({ initialAddOns }: { initialAddOns: AddOnRow[] }) {
  const [addOns, setAddOns] = useState(initialAddOns);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState<number | "">("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  function refresh() {
    fetch("/api/add-ons")
      .then((r) => r.json())
      .then(setAddOns)
      .catch(() => setError("Could not refresh add-ons."));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || newPrice === "") return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/add-ons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), price: Number(newPrice), sortOrder: addOns.length }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create add-on.");
      return;
    }
    setNewName("");
    setNewPrice("");
    refresh();
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim() || editPrice === "") return;
    const res = await fetch(`/api/add-ons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), price: Number(editPrice) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not update add-on.");
      return;
    }
    setEditingId(null);
    refresh();
  }

  async function handleToggleAvailable(addOn: AddOnRow) {
    const res = await fetch(`/api/add-ons/${addOn.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !addOn.isAvailable }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not update add-on.");
      return;
    }
    refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete add-on "${name}"? It won't be selectable on future orders — past orders are unaffected.`)) return;
    const res = await fetch(`/api/add-ons/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not delete add-on.");
      return;
    }
    refresh();
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex max-w-md flex-wrap gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New add-on name, e.g. Extra Rice…"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="Price"
          className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim() || newPrice === ""}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </form>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <ul className="mt-5 divide-y divide-border rounded-xl border border-border bg-card">
        {addOns.map((addOn) => (
          <li key={addOn.id} className="flex items-center justify-between gap-3 px-4 py-3">
            {editingId === addOn.id ? (
              <div className="flex flex-1 gap-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ) : (
              <span className="font-medium">
                {addOn.name} <span className="ml-2 text-sm text-muted-foreground">{formatCurrency(addOn.price)}</span>
              </span>
            )}

            <div className="flex items-center gap-2">
              {editingId !== addOn.id && (
                <button
                  onClick={() => handleToggleAvailable(addOn)}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    addOn.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {addOn.isAvailable ? "Available" : "Hidden"}
                </button>
              )}

              {editingId === addOn.id ? (
                <>
                  <button
                    onClick={() => handleSaveEdit(addOn.id)}
                    className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"
                    aria-label="Save"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
                    aria-label="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditingId(addOn.id);
                      setEditName(addOn.name);
                      setEditPrice(addOn.price);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(addOn.id, addOn.name)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
        {addOns.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">No add-ons yet — add one above.</li>
        )}
      </ul>
    </div>
  );
}
