import { getInventoryItems } from "@/lib/inventory";
import { serializePrisma } from "@/lib/serialize";
import { WasteLogView } from "@/components/admin/waste-log-view";

export default async function WasteLogPage() {
  const items = await getInventoryItems();

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Waste &amp; Spoilage Log</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Log shrinkage separately from routine restocks/deductions — every entry is tagged with a
        reason so you can see how much (and why) inventory is being lost over time.
      </p>

      <div className="mt-6">
        <WasteLogView
          inventoryItems={serializePrisma(items).map((i) => ({
            id: i.id,
            name: i.name,
            unit: i.unit,
            quantityOnHand: i.quantityOnHand,
          }))}
        />
      </div>
    </main>
  );
}
