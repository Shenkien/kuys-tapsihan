import { getAddOns } from "@/lib/addons";
import { serializePrisma } from "@/lib/serialize";
import { AddOnManager } from "@/components/admin/addon-manager";

export default async function AdminAddOnsPage() {
  const addOns = await getAddOns();

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Add-ons</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upsell items customers can add to a menu item — Extra Rice, Extra Egg, and so on. Toggle
        one to "Hidden" to pull it from the ordering screen without losing its order history.
      </p>

      <div className="mt-6">
        <AddOnManager initialAddOns={serializePrisma(addOns)} />
      </div>
    </main>
  );
}
