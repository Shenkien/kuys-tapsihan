"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, Loader2, Search, ImageOff } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface MenuItemRow {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  category: { id: string; name: string };
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        checked ? "border-primary bg-primary" : "border-[#B8BEC8] bg-[#D1D5DB]"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export function MenuTable({ categories }: { categories: Category[] }) {
  const [items, setItems] = useState<MenuItemRow[] | null>(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (categoryId) params.set("categoryId", categoryId);
    if (status) params.set("status", status);

    fetch(`/api/menu?${params.toString()}`)
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setError("Could not load menu items."));
  }, [search, categoryId, status]);

  useEffect(() => {
    const timer = setTimeout(load, 300); // debounce search typing
    return () => clearTimeout(timer);
  }, [load]);

  async function handleToggle(id: string, field: "isAvailable" | "isBestSeller" | "isNew", value: boolean) {
    setItems((prev) => prev?.map((i) => (i.id === id ? { ...i, [field]: value } : i)) ?? prev);
    const res = await fetch(`/api/menu/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value }),
    });
    if (!res.ok) load(); // revert on failure by refetching
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Items with past orders are archived instead of removed.`)) return;
    setDeletingId(id);
    const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) load();
    else setError("Could not delete that item.");
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items…"
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="best_seller">Best seller</option>
            <option value="new">New</option>
          </select>
        </div>
        <Link
          href="/admin/menu/new"
          className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Item
        </Link>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Available</th>
              <th className="px-4 py-3 font-medium">Best Seller</th>
              <th className="px-4 py-3 font-medium">New</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {items?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No menu items found.
                </td>
              </tr>
            )}
            {items?.map((item) => (
              <tr key={item.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                      ) : (
                        <ImageOff className="m-auto mt-2.5 h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{item.category.name}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(item.price)}</td>
                <td className="px-4 py-3">
                  <Toggle
                    checked={item.isAvailable}
                    onChange={(v) => handleToggle(item.id, "isAvailable", v)}
                    label="Toggle availability"
                  />
                </td>
                <td className="px-4 py-3">
                  <Toggle
                    checked={item.isBestSeller}
                    onChange={(v) => handleToggle(item.id, "isBestSeller", v)}
                    label="Toggle best seller"
                  />
                </td>
                <td className="px-4 py-3">
                  <Toggle
                    checked={item.isNew}
                    onChange={(v) => handleToggle(item.id, "isNew", v)}
                    label="Toggle new"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/menu/${item.id}`}
                      className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
