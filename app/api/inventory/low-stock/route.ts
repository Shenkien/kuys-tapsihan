import { NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getLowStockItems } from "@/lib/inventory";
import { serializePrisma } from "@/lib/serialize";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const items = await getLowStockItems();
  return NextResponse.json(serializePrisma(items));
}
