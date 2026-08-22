"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, ImageOff, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ComboRow {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  items: { quantity: number; menuItem: { name: string } }[];
}

export function ComboTable({ initialCombos }: { initialCombos: ComboRow[] }) {
  const [combos, setCombos] = useState(initialCombos);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  function refresh() {
    fetch("/api/combos")
      .then((r) => r.json())
      .then(setCombos)
      .catch(() => setError("Could not refresh combos."));
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete combo "${name}"?`)) return;
    const res = await fetch(`/api/combos/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not delete combo.");
      return;
    }
    refresh();
  }

  return (
    <div>
      <div className="flex justify-end">
        <Link
          href="/admin/combos/new"
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Combo
        </Link>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {combos.length === 0 && (
          <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No combo meals yet — create one to get started.
          </p>
        )}
        {combos.map((combo) => (
          <div key={combo.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              {combo.imageUrl ? (
                <Image src={combo.imageUrl} alt="" fill className="object-cover" />
              ) : (
                <ImageOff className="m-auto mt-4 h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{combo.name}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    combo.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {combo.isAvailable ? "Available" : "Hidden"}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {combo.items.map((i) => (i.quantity > 1 ? `${i.quantity}x ${i.menuItem.name}` : i.menuItem.name)).join(", ")}
              </p>
            </div>

            <p className="shrink-0 font-medium">{formatCurrency(combo.price)}</p>

            <div className="flex shrink-0 items-center gap-1">
              <Link
                href={`/admin/combos/${combo.id}`}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                onClick={() => handleDelete(combo.id, combo.name)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
