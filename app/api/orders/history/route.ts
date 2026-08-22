import { NextRequest, NextResponse } from "next/server";
import { getOrderHistory, type OrderHistoryFilters } from "@/lib/orders";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { serializePrisma } from "@/lib/serialize";

// Order History / Sales Inquiry Module — Admin-only searchable archive of
// every order (unlike GET /api/orders, which only returns the *active*
// kitchen queue). Supports filtering by order number, status, channel,
// payment status, and a date range, with pagination.
export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const params = request.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");

  const result = await getOrderHistory({
    search: params.get("search") || undefined,
    status: (params.get("status") || undefined) as OrderHistoryFilters["status"],
    channel: (params.get("channel") || undefined) as OrderHistoryFilters["channel"],
    paymentStatus: (params.get("paymentStatus") || undefined) as OrderHistoryFilters["paymentStatus"],
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    page: params.get("page") ? Number(params.get("page")) : undefined,
    pageSize: params.get("pageSize") ? Number(params.get("pageSize")) : undefined,
  });

  return NextResponse.json(serializePrisma(result));
}
