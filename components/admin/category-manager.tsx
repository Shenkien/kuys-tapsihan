"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2, AlertCircle } from "lucide-react";

interface CategoryRow {
  id: string;
  name: string;
  sortOrder: number;
  _count: { menuItems: number };
}

export function CategoryManager({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  function refresh() {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => setError("Could not refresh categories."));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), sortOrder: categories.length }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create category.");
      return;
    }
    setNewName("");
    refresh();
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not rename category.");
      return;
    }
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not delete category.");
      return;
    }
    refresh();
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex max-w-md gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name…"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
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
        {categories.map((cat) => (
          <li key={cat.id} className="flex items-center justify-between gap-3 px-4 py-3">
            {editingId === cat.id ? (
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename(cat.id)}
                className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            ) : (
              <span className="font-medium">{cat.name}</span>
            )}

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                {cat._count.menuItems} item{cat._count.menuItems === 1 ? "" : "s"}
              </span>

              {editingId === cat.id ? (
                <>
                  <button
                    onClick={() => handleRename(cat.id)}
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
                      setEditingId(cat.id);
                      setEditName(cat.name);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="Rename"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id, cat.name)}
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
        {categories.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            No categories yet — add one above.
          </li>
        )}
      </ul>
    </div>
  );
}
