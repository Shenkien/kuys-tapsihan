import { NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getSalesForecast } from "@/lib/forecasting";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const forecast = await getSalesForecast();
  return NextResponse.json(forecast);
}
