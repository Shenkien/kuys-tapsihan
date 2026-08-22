import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getPurchaseOrder } from "@/lib/purchase-orders";
import { serializePrisma } from "@/lib/serialize";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const po = await getPurchaseOrder(id);
  if (!po) return NextResponse.json({ error: "Purchase order not found." }, { status: 404 });

  return NextResponse.json(serializePrisma(po));
}
