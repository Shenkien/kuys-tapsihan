"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MenuItemOption {
  id: string;
  name: string;
  category: { name: string };
}

interface InventoryItemOption {
  id: string;
  name: string;
  unit: string;
}

interface Row {
  inventoryItemId: string;
  quantityUsed: number | "";
}

interface RecipeResponse {
  ingredients: Array<{ inventoryItemId: string; quantityUsed: number; inventoryItem: InventoryItemOption }>;
  cost: number;
  availability: { available: boolean; insufficient: Array<{ name: string; needed: number; onHand: number }> };
}

export function RecipeManager({
  menuItems,
  inventoryItems,
}: {
  menuItems: MenuItemOption[];
  inventoryItems: InventoryItemOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("menuItemId") ?? menuItems[0]?.id ?? "";

  const [menuItemId, setMenuItemId] = useState(initialId);
  const [rows, setRows] = useState<Row[]>([]);
  const [cost, setCost] = useState(0);
  const [availability, setAvailability] = useState<RecipeResponse["availability"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!menuItemId) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    router.replace(`/admin/recipes?menuItemId=${menuItemId}`, { scroll: false });

    fetch(`/api/recipes?menuItemId=${menuItemId}`)
      .then((r) => r.json())
      .then((data: RecipeResponse) => {
        setRows(
          data.ingredients.map((i) => ({
            inventoryItemId: i.inventoryItemId,
            quantityUsed: i.quantityUsed,
          }))
        );
        setCost(data.cost);
        setAvailability(data.availability);
      })
      .catch(() => setError("Could not load recipe."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItemId]);

  function addRow() {
    setRows((r) => [...r, { inventoryItemId: "", quantityUsed: "" }]);
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((r) => r.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError(null);
    const cleaned = rows.filter((r) => r.inventoryItemId && r.quantityUsed !== "" && Number(r.quantityUsed) > 0);
    if (cleaned.length === 0) {
      setError("Add at least one ingredient with a quantity greater than 0.");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/recipes/${menuItemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredients: cleaned.map((r) => ({
          inventoryItemId: r.inventoryItemId,
          quantityUsed: Number(r.quantityUsed),
        })),
      }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      setError(data?.error ?? "Could not save recipe.");
      return;
    }
    setSaved(true);
    // Refresh cost/availability after save
    fetch(`/api/recipes?menuItemId=${menuItemId}`)
      .then((r) => r.json())
      .then((d: RecipeResponse) => {
        setCost(d.cost);
        setAvailability(d.availability);
      });
  }

  const usedInventoryIds = new Set(rows.map((r) => r.inventoryItemId).filter(Boolean));

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <div>
        <label className="mb-1 block text-sm font-medium">Menu Item</label>
        <select
          value={menuItemId}
          onChange={(e) => setMenuItemId(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {menuItems.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.category.name})
            </option>
          ))}
        </select>
      </div>

      <div>
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={row.inventoryItemId}
                    onChange={(e) => updateRow(i, { inventoryItemId: e.target.value })}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select ingredient…</option>
                    {inventoryItems
                      .filter((inv) => inv.id === row.inventoryItemId || !usedInventoryIds.has(inv.id))
                      .map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} ({inv.unit})
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Qty used"
                    value={row.quantityUsed}
                    onChange={(e) =>
                      updateRow(i, { quantityUsed: e.target.value === "" ? "" : Number(e.target.value) })
                    }
                    className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={() => removeRow(i)}
                    className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove ingredient"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                onClick={addRow}
                className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                Add Ingredient
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <p className="text-sm">
                <span className="text-muted-foreground">Ingredient cost per order: </span>
                <span className="font-semibold">{formatCurrency(cost)}</span>
              </p>
              {availability && (
                <p
                  className={
                    availability.available
                      ? "flex items-center gap-1.5 text-sm text-emerald-600"
                      : "flex items-center gap-1.5 text-sm text-destructive"
                  }
                >
                  {availability.available ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {availability.available
                    ? "All ingredients in stock"
                    : `Short on: ${availability.insufficient.map((i) => i.name).join(", ")}`}
                </p>
              )}
            </div>

            {error && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
            {saved && !error && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Recipe saved.
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Recipe
            </button>
          </>
        )}
      </div>
    </div>
  );
}
