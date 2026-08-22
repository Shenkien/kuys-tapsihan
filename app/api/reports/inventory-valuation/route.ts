import { NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getInventoryValuation } from "@/lib/inventory";
import { serializePrisma } from "@/lib/serialize";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const valuation = await getInventoryValuation();
  return NextResponse.json(serializePrisma(valuation));
}
