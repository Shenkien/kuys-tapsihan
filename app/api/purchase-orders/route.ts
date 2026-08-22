import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getPurchaseOrders, createPurchaseOrder } from "@/lib/purchase-orders";
import { purchaseOrderSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const pos = await getPurchaseOrders();
  return NextResponse.json(serializePrisma(pos));
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = purchaseOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const po = await createPurchaseOrder(parsed.data, session.user.id);
    return NextResponse.json(serializePrisma(po), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create purchase order." }, { status: 500 });
  }
}
