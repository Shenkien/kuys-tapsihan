"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload, ImageOff, AlertCircle, Plus, Trash2 } from "lucide-react";

interface MenuItemOption {
  id: string;
  name: string;
}

export interface ComboFormValues {
  id?: string;
  name: string;
  description: string;
  price: number | "";
  imageUrl: string;
  isAvailable: boolean;
  items: { menuItemId: string; quantity: number }[];
}

const emptyValues: ComboFormValues = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  isAvailable: true,
  items: [],
};

export function ComboForm({
  menuItems,
  initialValues,
}: {
  menuItems: MenuItemOption[];
  initialValues?: ComboFormValues;
}) {
  const router = useRouter();
  const isEdit = Boolean(initialValues?.id);

  const [values, setValues] = useState<ComboFormValues>(initialValues ?? emptyValues);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ComboFormValues>(key: K, value: ComboFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function addItemRow() {
    if (menuItems.length === 0) return;
    set("items", [...values.items, { menuItemId: menuItems[0].id, quantity: 1 }]);
  }

  function updateItemRow(index: number, patch: Partial<{ menuItemId: string; quantity: number }>) {
    set(
      "items",
      values.items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function removeItemRow(index: number) {
    set("items", values.items.filter((_, i) => i !== index));
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      set("imageUrl", data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.name.trim() || values.price === "") {
      setError("Name and price are required.");
      return;
    }
    if (values.items.length === 0) {
      setError("Add at least one menu item to this combo.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(isEdit ? `/api/combos/${values.id}` : "/api/combos", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, price: Number(values.price) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save combo meal.");
      router.push("/admin/combos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save combo meal.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <div>
          <label className="mb-1 block text-sm font-medium">Photo</label>
          <div className="relative h-28 w-28 overflow-hidden rounded-lg border border-dashed border-border bg-muted">
            {values.imageUrl ? (
              <Image src={values.imageUrl} alt="" fill className="object-cover" />
            ) : (
              <ImageOff className="m-auto mt-9 h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-input px-2 py-1.5 text-xs font-medium transition hover:bg-secondary">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Uploading…" : "Upload"}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Combo name</label>
            <input
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Tapsilog + Drink Combo"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Bundle price (₱)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values.price}
                onChange={(e) => set("price", e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Availability</label>
              <select
                value={values.isAvailable ? "yes" : "no"}
                onChange={(e) => set("isAvailable", e.target.value === "yes")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="yes">Available</option>
                <option value="no">Hidden</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium">Included menu items</label>
          <button
            type="button"
            onClick={addItemRow}
            disabled={menuItems.length === 0}
            className="flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs font-medium transition hover:bg-secondary disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add item
          </button>
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          {values.items.length === 0 && (
            <p className="py-2 text-center text-sm text-muted-foreground">No items yet — add one above.</p>
          )}
          {values.items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                value={item.menuItemId}
                onChange={(e) => updateItemRow(index, { menuItemId: e.target.value })}
                className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {menuItems.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                max="20"
                value={item.quantity}
                onChange={(e) => updateItemRow(index, { quantity: Number(e.target.value) })}
                className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => removeItemRow(index)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
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
        {isEdit ? "Save Changes" : "Create Combo"}
      </button>
    </form>
  );
}
