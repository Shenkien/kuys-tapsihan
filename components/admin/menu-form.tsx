"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload, ImageOff, AlertCircle } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

export interface MenuFormValues {
  id?: string;
  name: string;
  description: string;
  price: number | "";
  categoryId: string;
  imageUrl: string;
  isAvailable: boolean;
  isBestSeller: boolean;
  isNew: boolean;
}

const emptyValues: MenuFormValues = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  imageUrl: "",
  isAvailable: true,
  isBestSeller: false,
  isNew: false,
};

export function MenuForm({
  categories,
  initialValues,
}: {
  categories: Category[];
  initialValues?: MenuFormValues;
}) {
  const router = useRouter();
  const isEdit = Boolean(initialValues?.id);

  const [values, setValues] = useState<MenuFormValues>(initialValues ?? emptyValues);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof MenuFormValues>(key: K, value: MenuFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
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

    if (!values.name.trim() || !values.categoryId || values.price === "") {
      setError("Name, category, and price are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(isEdit ? `/api/menu/${values.id}` : "/api/menu", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, price: Number(values.price) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save menu item.");
      router.push("/admin/menu");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save menu item.");
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
            <label className="mb-1 block text-sm font-medium" htmlFor="name">
              Item Name
            </label>
            <input
              id="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="category">
                Category
              </label>
              <select
                id="category"
                value={values.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="price">
                Price (₱)
              </label>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={values.price}
                onChange={(e) => set("price", e.target.value === "" ? "" : Number(e.target.value))}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-wrap gap-6">
        {(
          [
            ["isAvailable", "Available"],
            ["isBestSeller", "Best Seller"],
            ["isNew", "New"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={values[key]}
              onChange={(e) => set(key, e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {label}
          </label>
        ))}
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
          disabled={submitting || uploading}
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Create Item"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/menu")}
          className="rounded-md border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
