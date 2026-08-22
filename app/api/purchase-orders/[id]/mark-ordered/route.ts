import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { markPurchaseOrderOrdered, PurchaseOrderError } from "@/lib/purchase-orders";
import { serializePrisma } from "@/lib/serialize";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  try {
    const po = await markPurchaseOrderOrdered(id);
    return NextResponse.json(serializePrisma(po));
  } catch (err) {
    if (err instanceof PurchaseOrderError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not update purchase order." }, { status: 500 });
  }
}
