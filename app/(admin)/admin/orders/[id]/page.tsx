import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Store, QrCode } from "lucide-react";
import { getOrderById } from "@/lib/orders";
import { serializePrisma } from "@/lib/serialize";
import { formatCurrency } from "@/lib/utils";
import { MarkPaidForm } from "@/components/admin/mark-paid-form";
import { RefundOrderButton } from "@/components/admin/refund-order-button";

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

const DISCOUNT_LABEL: Record<string, string> = {
  NONE: "None",
  SENIOR_CITIZEN: "Senior Citizen (RA 9994)",
  PWD: "PWD (RA 10754)",
  PROMO: "Promo / manual",
};

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orderRaw = await getOrderById(id);
  if (!orderRaw) notFound();

  const order = serializePrisma(orderRaw);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/admin/orders" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Order History
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Order #{order.orderNumber}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {order.channel === "KIOSK" ? <Store className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
            <span>
              {order.channel === "KIOSK" ? `Kiosk${order.table ? ` · Table ${order.table.tableNumber}` : ""}` : "QR order"}
            </span>
            {order.customerName && <span>· {order.customerName}</span>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Placed {new Date(order.createdAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`h-fit rounded-full px-3 py-1 text-xs font-medium ${STATUS_TONE[order.status]}`}>
            {order.status}
          </span>
          <span className={`h-fit rounded-full px-3 py-1 text-xs font-medium ${PAYMENT_TONE[order.paymentStatus]}`}>
            {order.paymentStatus}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold">Items</h2>
            <ul className="mt-3 space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="border-t border-border/60 pt-3 first:border-0 first:pt-0">
                  <div className="flex justify-between text-sm font-medium">
                    <span>
                      {item.quantity}x {item.menuItem?.name ?? item.comboMeal?.name ?? "Item"}
                    </span>
                    <span>{formatCurrency(item.subtotal)}</span>
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

            <div className="mt-4 space-y-1 border-t border-border/60 pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Discount ({DISCOUNT_LABEL[order.discountType]})</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              {order.serviceChargeAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Service charge</span>
                  <span>{formatCurrency(order.serviceChargeAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>VAT</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-1 font-display font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {order.paymentStatus === "PAID" && (
            <div className="rounded-xl border border-border bg-card p-5 text-sm">
              <h2 className="font-display font-semibold">Payment</h2>
              <div className="mt-2 space-y-1 text-muted-foreground">
                <p>Receipt #: {order.receiptNumber}</p>
                <p>Method: {order.paymentMethod}</p>
                <p>Paid: {order.paidAt && new Date(order.paidAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</p>
                {order.handledBy && <p>Confirmed by: {order.handledBy.name}</p>}
              </div>
            </div>
          )}

          {order.paymentStatus === "REFUNDED" && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
              <h2 className="font-display font-semibold text-destructive">Refunded</h2>
              <div className="mt-2 space-y-1 text-muted-foreground">
                <p>Amount: {order.refundedAmount && formatCurrency(order.refundedAmount)}</p>
                <p>Reason: {order.refundReason}</p>
                <p>Refunded: {order.refundedAt && new Date(order.refundedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</p>
                {order.refundedBy && <p>By: {order.refundedBy.name}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {order.status !== "CANCELLED" && order.paymentStatus === "UNPAID" && <MarkPaidForm orderId={order.id} />}
          {order.paymentStatus === "PAID" && <RefundOrderButton orderId={order.id} />}
          {order.status === "CANCELLED" && order.paymentStatus === "UNPAID" && (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              This order was cancelled — no payment was taken.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
