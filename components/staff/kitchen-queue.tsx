"use client";

import { useEffect, useMemo, useState } from "react";
import { ChefHat, Loader2 } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import { KITCHEN_CHANNEL, KITCHEN_EVENTS } from "@/lib/pusher-events";
import { OrderCard } from "./order-card";
import { ReceiptPreviewModal } from "./receipt-preview-modal";
import type { ReceiptData } from "@/lib/receipt";

// Kept intentionally close to the Prisma shape (already-serialized: Decimal
// fields as plain numbers, dates as ISO strings) so the same type works for
// both the initial REST fetch and incoming Pusher payloads.
export interface QueueOrder {
  id: string;
  orderNumber: string;
  channel: "KIOSK" | "QR";
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  totalAmount: number;
  createdAt: string;
  table: { tableNumber: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    notes: string | null;
    menuItem: { name: string } | null;
    comboMeal: { name: string } | null;
    addOns: Array<{ name: string; price: number; quantity: number }>;
  }>;
}

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "READY"] as const;

function isActiveStatus(status: string): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function KitchenQueue() {
  const [orders, setOrders] = useState<QueueOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<ReceiptData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/orders")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load the queue.");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setOrders(data.orders);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the current queue. Try refreshing.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(KITCHEN_CHANNEL);

    channel.bind(KITCHEN_EVENTS.ORDER_NEW, (incoming: QueueOrder) => {
      setOrders((prev) => {
        if (!prev) return [incoming];
        if (prev.some((o) => o.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    });

    channel.bind(KITCHEN_EVENTS.ORDER_UPDATED, (incoming: QueueOrder) => {
      setOrders((prev) => {
        if (!prev) return prev;
        if (!isActiveStatus(incoming.status)) return prev.filter((o) => o.id !== incoming.id);
        const exists = prev.some((o) => o.id === incoming.id);
        return exists ? prev.map((o) => (o.id === incoming.id ? incoming : o)) : [...prev, incoming];
      });
    });

    return () => {
      pusher.unsubscribe(KITCHEN_CHANNEL);
    };
  }, []);

  const { pending, confirmed, preparing, ready } = useMemo(() => {
    const list = orders ?? [];
    return {
      pending: list.filter((o) => o.status === "PENDING").sort(sortByCreatedAt),
      confirmed: list.filter((o) => o.status === "CONFIRMED").sort(sortByCreatedAt),
      preparing: list.filter((o) => o.status === "PREPARING").sort(sortByCreatedAt),
      ready: list.filter((o) => o.status === "READY").sort(sortByCreatedAt),
    };
  }, [orders]);

  async function patchOrder(id: string, status: "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED") {
    setError(null);
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      return;
    }
    // Locally reconcile immediately too — don't wait on the Pusher
    // round-trip for the person who just clicked the button.
    setOrders((prev) => {
      if (!prev) return prev;
      if (!isActiveStatus(status)) return prev.filter((o) => o.id !== id);
      return prev.map((o) => (o.id === id ? { ...o, ...data.order } : o));
    });
    if (status === "CONFIRMED" && data.receipt) {
      setReceiptPreview(data.receipt.data);
    }
  }

  if (error && orders === null) {
    return (
      <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (orders === null) {
    return (
      <div className="mt-8 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading the queue…
      </div>
    );
  }

  const totalActive = pending.length + confirmed.length + preparing.length + ready.length;

  const columns = [
    { key: "pending", title: "New Orders", orders: pending, badgeClass: "bg-primary text-primary-foreground", empty: "Nothing waiting." },
    { key: "confirmed", title: "Queued", orders: confirmed, badgeClass: "bg-amber-500 text-white", empty: "Nothing queued." },
    { key: "preparing", title: "Cooking", orders: preparing, badgeClass: "bg-orange-500 text-white", empty: "Nothing on the stove." },
    { key: "ready", title: "Ready", orders: ready, badgeClass: "bg-emerald-600 text-white", empty: "Nothing ready yet." },
  ] as const;

  return (
    <div className="mt-6">
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {totalActive === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground">
          <ChefHat className="h-8 w-8" />
          <p className="text-sm">No active orders right now. New orders will appear here instantly.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          {columns.map((col) => (
            <section key={col.key}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {col.title}
                {col.orders.length > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${col.badgeClass}`}>{col.orders.length}</span>
                )}
              </h2>
              <div className="space-y-3">
                {col.orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{col.empty}</p>
                ) : (
                  col.orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onAdvance={(id, status) => patchOrder(id, status)}
                      onCancel={(id) => patchOrder(id, "CANCELLED")}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {receiptPreview && <ReceiptPreviewModal receipt={receiptPreview} onClose={() => setReceiptPreview(null)} />}
    </div>
  );
}

function sortByCreatedAt(a: QueueOrder, b: QueueOrder) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}
