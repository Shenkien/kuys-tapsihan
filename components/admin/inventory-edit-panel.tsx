"use client";

import { useRouter } from "next/navigation";
import { InventoryForm, type InventoryFormValues } from "@/components/admin/inventory-form";

export function InventoryEditPanel({ initialValues }: { initialValues: InventoryFormValues }) {
  const router = useRouter();

  return (
    <InventoryForm
      initialValues={initialValues}
      onSaved={() => {
        router.push("/admin/inventory");
        router.refresh();
      }}
      onCancel={() => router.push("/admin/inventory")}
    />
  );
}
