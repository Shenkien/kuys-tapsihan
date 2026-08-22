import { getSuppliers } from "@/lib/suppliers";
import { serializePrisma } from "@/lib/serialize";
import { SupplierManager } from "@/components/admin/supplier-manager";

export default async function AdminSuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Suppliers</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Who you buy ingredients from — linked to Purchase Orders so every restock traces back to
        where it came from.
      </p>

      <div className="mt-6">
        <SupplierManager initialSuppliers={serializePrisma(suppliers)} />
      </div>
    </main>
  );
}
