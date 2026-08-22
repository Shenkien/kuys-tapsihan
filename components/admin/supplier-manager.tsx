"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, AlertCircle } from "lucide-react";

interface SupplierRow {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  _count: { purchaseOrders: number };
}

const emptyForm = { name: "", contactPerson: "", phone: "", email: "", address: "" };

export function SupplierManager({ initialSuppliers }: { initialSuppliers: SupplierRow[] }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  function refresh() {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then(setSuppliers)
      .catch(() => setError("Could not refresh suppliers."));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create supplier.");
      return;
    }
    setForm(emptyForm);
    refresh();
  }

  async function handleSaveEdit(id: string) {
    const res = await fetch(`/api/suppliers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not update supplier.");
      return;
    }
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not delete supplier.");
      return;
    }
    refresh();
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="grid max-w-2xl gap-2 sm:grid-cols-2">
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Supplier name…"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={form.contactPerson}
          onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
          placeholder="Contact person"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          placeholder="Phone"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          placeholder="Email"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={creating || !form.name.trim()}
          className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50 sm:col-span-2"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Supplier
        </button>
      </form>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <ul className="mt-5 divide-y divide-border rounded-xl border border-border bg-card">
        {suppliers.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
            {editingId === s.id ? (
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <input
                  autoFocus
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={editForm.contactPerson}
                  onChange={(e) => setEditForm((f) => ({ ...f, contactPerson: e.target.value }))}
                  placeholder="Contact person"
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone"
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ) : (
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[s.contactPerson, s.phone, s.email].filter(Boolean).join(" · ") || "No contact details"}
                </p>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-3">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                {s._count.purchaseOrders} PO{s._count.purchaseOrders === 1 ? "" : "s"}
              </span>

              {editingId === s.id ? (
                <>
                  <button onClick={() => handleSaveEdit(s.id)} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" aria-label="Save">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary" aria-label="Cancel">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditingId(s.id);
                      setEditForm({
                        name: s.name,
                        contactPerson: s.contactPerson ?? "",
                        phone: s.phone ?? "",
                        email: s.email ?? "",
                        address: "",
                      });
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
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
        {suppliers.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">No suppliers yet — add one above.</li>
        )}
      </ul>
    </div>
  );
}
