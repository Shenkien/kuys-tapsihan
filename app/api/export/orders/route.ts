import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getOrderHistory } from "@/lib/orders";
import { toCsv, csvResponseHeaders } from "@/lib/export";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const params = request.nextUrl.searchParams;
  const from = params.get("from") ? new Date(`${params.get("from")}T00:00:00`) : undefined;
  const to = params.get("to") ? new Date(`${params.get("to")}T23:59:59.999`) : undefined;

  // Export everything in the range — bump past the default page size rather
  // than paginate, since a CSV download is meant to be one complete file.
  const { orders } = await getOrderHistory({ from, to, pageSize: 5000 });

  const csv = toCsv(
    orders.map((o) => ({
      orderNumber: o.orderNumber,
      channel: o.channel,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod ?? "",
      subtotal: Number(o.subtotal).toFixed(2),
      tax: Number(o.taxAmount).toFixed(2),
      serviceCharge: Number(o.serviceChargeAmount).toFixed(2),
      discount: Number(o.discountAmount).toFixed(2),
      total: Number(o.totalAmount).toFixed(2),
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt ? o.paidAt.toISOString() : "",
    })),
    [
      { key: "orderNumber", header: "Order #" },
      { key: "channel", header: "Channel" },
      { key: "status", header: "Status" },
      { key: "paymentStatus", header: "Payment Status" },
      { key: "paymentMethod", header: "Payment Method" },
      { key: "subtotal", header: "Subtotal" },
      { key: "tax", header: "Tax" },
      { key: "serviceCharge", header: "Service Charge" },
      { key: "discount", header: "Discount" },
      { key: "total", header: "Total" },
      { key: "createdAt", header: "Placed At" },
      { key: "paidAt", header: "Paid At" },
    ]
  );

  return new NextResponse(csv, { headers: csvResponseHeaders("orders-export.csv") });
}
