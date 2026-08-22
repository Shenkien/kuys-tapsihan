import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { regenerateTableQrToken } from "@/lib/tables";
import { serializePrisma } from "@/lib/serialize";

// Issues a fresh QR token for a table — the previously printed sticker
// stops working the moment this runs, since /order/[tableToken] looks the
// token up directly.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const table = await regenerateTableQrToken(id);
  return NextResponse.json(serializePrisma(table));
}
