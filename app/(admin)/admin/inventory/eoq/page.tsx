import { EoqSuggestionsView } from "@/components/admin/eoq-suggestions-view";

export default function EoqPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Reorder Suggestions (EOQ)</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Economic Order Quantity — how much to order, not just when.
      </p>

      <div className="mt-6">
        <EoqSuggestionsView />
      </div>
    </main>
  );
}
