"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface OrderRow {
  id: string;
  orderNumber: string;
  channel: "KIOSK" | "QR";
  status: string;
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
  totalAmount: number;
  createdAt: string;
  table: { tableNumber: string } | null;
}

const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-secondary text-secondary-foreground",
  CONFIRMED: "bg-primary/10 text-primary",
  PREPARING: "bg-primary/10 text-primary",
  READY: "bg-primary/10 text-primary",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-destructive/10 text-destructive",
};

const PAYMENT_TONE: Record<string, string> = {
  UNPAID: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  REFUNDED: "bg-destructive/10 text-destructive",
};

export function OrderHistoryTable() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (channel) params.set("channel", channel);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    params.set("page", String(page));

    fetch(`/api/orders/history?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setOrders(data.orders);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      });
  }, [search, status, channel, paymentStatus, page]);

  useEffect(() => {
    const timer = setTimeout(load, 300); // debounce search typing
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => setPage(1), [search, status, channel, paymentStatus]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #…"
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All channels</option>
          <option value="KIOSK">Kiosk</option>
          <option value="QR">QR</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PREPARING">Preparing</option>
          <option value="READY">Ready</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All payment statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PAID">Paid</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <span className="text-xs text-muted-foreground sm:ml-auto">{total} order{total === 1 ? "" : "s"}</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Order #</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders === null && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {orders?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No orders match these filters.
                </td>
              </tr>
            )}
            {orders?.map((order) => (
              <tr key={order.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.channel === "KIOSK" ? `Kiosk${order.table ? ` · ${order.table.tableNumber}` : ""}` : "QR"}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_TONE[order.status])}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PAYMENT_TONE[order.paymentStatus])}>
                    {order.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{formatCurrency(order.totalAmount)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-secondary disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-secondary disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
