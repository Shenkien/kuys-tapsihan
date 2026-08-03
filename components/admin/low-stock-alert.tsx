import { AlertTriangle } from "lucide-react";

interface LowStockItem {
  id: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  reorderThreshold: number;
}

export function LowStockAlert({ items }: { items: LowStockItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        Everything is above its reorder threshold. Nothing needs restocking right now.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <h3 className="font-display font-semibold">Low Stock Alert</h3>
      </div>
      <ul className="mt-3 divide-y divide-border/60">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between py-2 text-sm">
            <span className="font-medium">{item.name}</span>
            <span className="text-muted-foreground">
              {item.quantityOnHand} {item.unit}{" "}
              <span className="text-destructive">
                (reorder at {item.reorderThreshold} {item.unit})
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
