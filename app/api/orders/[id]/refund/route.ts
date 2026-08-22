import { NextRequest, NextResponse } from "next/server";
import { refundOrder, OrderError } from "@/lib/orders";
import { refundOrderSchema } from "@/lib/validation";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { serializePrisma } from "@/lib/serialize";
import { logAudit } from "@/lib/audit";

// Void / Refund Transaction Module — Admin-only. A refund reverses money
// already taken, so it sits at a higher permission tier than confirming a
// payment or updating the kitchen queue (both Staff+Admin).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = refundOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "A refund reason is required." }, { status: 400 });
  }

  try {
    const order = await refundOrder(id, parsed.data, session.user.id);

    await logAudit({
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email ?? "Admin",
      action: "ORDER_REFUNDED",
      entityType: "Order",
      entityId: id,
      description: `Refunded order #${order.orderNumber} (${order.totalAmount}) — reason: ${parsed.data.reason}`,
    });

    return NextResponse.json({ order: serializePrisma(order) });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Refund failed:", err);
    return NextResponse.json({ error: "Could not process the refund. Please try again." }, { status: 500 });
  }
}
