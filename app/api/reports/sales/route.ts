import { NextRequest, NextResponse } from "next/server";
import { getSalesReport } from "@/lib/orders";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { serializePrisma } from "@/lib/serialize";

// Sales Report Module — Admin-only. Defaults to the last 7 days if no
// range is given so the report page always has something to show.
export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const params = request.nextUrl.searchParams;
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

  const fromParam = params.get("from");
  const toParam = params.get("to");

  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : defaultFrom;
  const to = toParam ? new Date(`${toParam}T23:59:59.999`) : now;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  const report = await getSalesReport({ from, to });
  return NextResponse.json(serializePrisma(report));
}
