"use client";

import { useState } from "react";
import { Clock, Store, QrCode, Loader2, Printer, CheckCircle2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { QueueOrder } from "./kitchen-queue";

function elapsedLabel(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  return `${mins} min ago`;
}

export function OrderCard({
  order,
  onReceive,
  onComplete,
  onCancel,
}: {
  order: QueueOrder;
  onReceive: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState<"receive" | "complete" | "cancel" | null>(null);

  const run = async (kind: "receive" | "complete" | "cancel", fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

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
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            order.status === "PENDING" ? "bg-primary text-primary-foreground" : "bg-amber-500/15 text-amber-600"
          }`}
        >
          {order.status === "PENDING" ? "New" : "Preparing"}
        </span>
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
        {order.status === "PENDING" ? (
          <button
            onClick={() => run("receive", () => onReceive(order.id))}
            disabled={busy !== null}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy === "receive" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Receive
          </button>
        ) : (
          <button
            onClick={() => run("complete", () => onComplete(order.id))}
            disabled={busy !== null}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy === "complete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Complete
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
