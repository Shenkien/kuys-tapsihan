"use client";

import { useState } from "react";
import { Clock, Store, QrCode, Loader2, Printer, ChefHat, BellRing, CheckCircle2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { QueueOrder } from "./kitchen-queue";

function elapsedLabel(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  return `${mins} min ago`;
}

const STAGE_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "New", className: "bg-primary text-primary-foreground" },
  CONFIRMED: { label: "Queued", className: "bg-amber-500/15 text-amber-600" },
  PREPARING: { label: "Cooking", className: "bg-orange-500/15 text-orange-600" },
  READY: { label: "Ready", className: "bg-emerald-500/15 text-emerald-600" },
};

// Each status only ever needs to know how to move forward one step — see
// VALID_TRANSITIONS in lib/orders.ts for the same PENDING -> CONFIRMED ->
// PREPARING -> READY -> COMPLETED sequence enforced server-side.
const NEXT_ACTION: Record<
  string,
  { status: "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED"; label: string; icon: typeof Printer; className: string }
> = {
  PENDING: { status: "CONFIRMED", label: "Receive", icon: Printer, className: "bg-primary text-primary-foreground hover:bg-primary/90" },
  CONFIRMED: { status: "PREPARING", label: "Start Preparing", icon: ChefHat, className: "bg-amber-500 text-white hover:bg-amber-600" },
  PREPARING: { status: "READY", label: "Mark Ready", icon: BellRing, className: "bg-orange-500 text-white hover:bg-orange-600" },
  READY: { status: "COMPLETED", label: "Complete", icon: CheckCircle2, className: "bg-emerald-600 text-white hover:bg-emerald-700" },
};

export function OrderCard({
  order,
  onAdvance,
  onCancel,
}: {
  order: QueueOrder;
  onAdvance: (id: string, status: "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED") => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<"advance" | "cancel" | null>(null);

  const run = async (kind: "advance" | "cancel", fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const badge = STAGE_BADGE[order.status] ?? STAGE_BADGE.PENDING;
  const action = NEXT_ACTION[order.status];
  const ActionIcon = action?.icon ?? CheckCircle2;

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        order.status === "PENDING" ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-lg font-bold">#{order.orderNumber}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {order.channel === "KIOSK" ? <Store className="h-3.5 w-3.5" /> : <QrCode className="h-3.5 w-3.5" />}
            <span>{order.channel === "KIOSK" ? order.table?.tableNumber ?? "Kiosk" : "QR order"}</span>
            <span className="text-border">•</span>
            <Clock className="h-3.5 w-3.5" />
            <span>{elapsedLabel(order.createdAt)}</span>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
      </div>

      <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="text-sm">
            <div className="flex justify-between font-medium">
              <span>
                {item.quantity}x {item.menuItem?.name ?? item.comboMeal?.name}
              </span>
              <span className="text-muted-foreground">{formatCurrency(item.subtotal)}</span>
            </div>
            {item.addOns.length > 0 && (
              <p className="pl-4 text-xs text-muted-foreground">
                + {item.addOns.map((a) => (a.quantity > 1 ? `${a.quantity}x ${a.name}` : a.name)).join(", ")}
              </p>
            )}
            {item.notes && <p className="pl-4 text-xs italic text-muted-foreground">note: {item.notes}</p>}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="font-display font-bold">{formatCurrency(order.totalAmount)}</span>
      </div>

      <div className="mt-4 flex gap-2">
        {action && (
          <button
            onClick={() => run("advance", () => onAdvance(order.id, action.status))}
            disabled={busy !== null}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60 ${action.className}`}
          >
            {busy === "advance" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ActionIcon className="h-4 w-4" />}
            {action.label}
          </button>
        )}
        <button
          onClick={() => {
            if (confirm(`Cancel order #${order.orderNumber}? This restores any deducted inventory.`)) {
              run("cancel", () => onCancel(order.id));
            }
          }}
          disabled={busy !== null}
          className="flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-60"
          title="Cancel order"
        >
          {busy === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
