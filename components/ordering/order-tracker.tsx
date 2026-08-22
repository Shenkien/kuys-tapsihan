"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, XCircle, Bell, BellOff } from "lucide-react";
import { getPusherClient } from "@/lib/pusher-client";
import { orderChannelName, ORDER_STATUS_EVENT } from "@/lib/pusher-events";
import { formatCurrency } from "@/lib/utils";
import { FeedbackForm } from "./feedback-form";

interface TrackedOrder {
  id: string;
  orderNumber: string;
  channel: "KIOSK" | "QR";
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  table: { tableNumber: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    subtotal: number;
    menuItem: { name: string } | null;
    comboMeal: { name: string } | null;
  }>;
}

const STATUS_COPY: Record<string, { label: string; description: string }> = {
  PENDING: { label: "Order received", description: "We've got your order — the kitchen will confirm it shortly." },
  CONFIRMED: { label: "Confirmed", description: "The kitchen has confirmed your order and is getting started." },
  PREPARING: { label: "Being prepared", description: "Your food is being cooked right now." },
  READY: { label: "Ready!", description: "Your order is ready for pickup/serving." },
  COMPLETED: { label: "Completed", description: "Enjoy your meal! Thank you for ordering with us." },
  CANCELLED: { label: "Cancelled", description: "This order was cancelled. Please ask a staff member for help." },
};

const STATUS_STEPS = ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];

/** Plays a short chime using the Web Audio API — no audio file to host,
 * works the moment the page loads. */
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Web Audio not available — silently skip, the visual banner still shows.
  }
}

export function OrderTracker({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const lastStatus = useRef<string | null>(null);

  function notifyIfNeeded(status: string) {
    const isNewAndNotable = lastStatus.current !== null && lastStatus.current !== status && (status === "READY" || status === "COMPLETED");
    if (isNewAndNotable && notifyEnabled) {
      playChime();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("KUY'S Tapsihan", { body: STATUS_COPY[status]?.description ?? "Order status updated." });
      }
    }
    lastStatus.current = status;
  }

  async function enableNotifications() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    setNotifyEnabled(true);
    playChime(); // audible confirmation that sound is on
  }

  async function fetchOrder() {
    try {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (!res.ok) {
        setError("We couldn't find that order. Double-check the link.");
        return;
      }
      const data = await res.json();
      setOrder(data.order);
      notifyIfNeeded(data.order.status);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    } catch {
      // transient network error — the next poll/push will retry
    }
  }

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 8000); // fallback if Pusher is unreachable
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, notifyEnabled]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channelName = orderChannelName(orderId);
    const channel = pusher.subscribe(channelName);

    channel.bind(ORDER_STATUS_EVENT, () => {
      fetchOrder(); // re-fetch full order rather than trusting the push payload shape
    });

    return () => {
      pusher.unsubscribe(channelName);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-4 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-muted-foreground">
        <Clock className="mx-auto h-8 w-8 animate-pulse" />
        <p className="mt-3 text-sm">Loading your order…</p>
      </div>
    );
  }

  const copy = STATUS_COPY[order.status] ?? STATUS_COPY.PENDING;
  const stepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Order Number</p>
        <p className="font-display text-4xl font-black text-primary">{order.orderNumber}</p>
        {order.table && <p className="mt-1 text-sm text-muted-foreground">Table {order.table.tableNumber}</p>}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        {order.status !== "CANCELLED" ? (
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex flex-1 items-center">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i <= stepIndex ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 ${i < stepIndex ? "bg-primary" : "bg-secondary"}`} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
        )}

        <div className="mt-5 rounded-lg bg-secondary px-4 py-3 text-center">
          <p className="font-semibold">{copy.label}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{copy.description}</p>
        </div>

        <div className="mt-4 space-y-1 border-t border-border/60 pt-4 text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-muted-foreground">
              <span>
                {item.quantity}x {item.menuItem?.name ?? item.comboMeal?.name ?? "Item"}
              </span>
              <span>{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border/60 pt-2 font-display font-bold">
            <span>Total</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {order.status === "COMPLETED" && <FeedbackForm orderId={order.id} />}

      {!notifyEnabled ? (
        <button
          onClick={enableNotifications}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-secondary"
        >
          <Bell className="h-4 w-4" />
          Notify me when it's ready
        </button>
      ) : (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <BellOff className="h-3.5 w-3.5" />
          You'll be alerted on this device when your order is ready.
        </p>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Bookmark or save this link — it stays valid for this order.
      </p>
    </div>
  );
}
