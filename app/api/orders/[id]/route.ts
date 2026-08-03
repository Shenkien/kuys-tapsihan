import { NextRequest, NextResponse } from "next/server";
import { getOrderStatus, updateOrderStatus, toReceiptData, OrderError } from "@/lib/orders";
import { orderStatusUpdateSchema } from "@/lib/validation";
import { requireStaff, isErrorResponse } from "@/lib/staff-guard";
import { serializePrisma } from "@/lib/serialize";
import { buildReceiptEscPos } from "@/lib/receipt";
import { publishKitchenEvent, KITCHEN_EVENTS } from "@/lib/pusher-server";

// Public by design: the order `id` is an unguessable cuid, so knowing it is
// treated as proof enough to check that one order's status (same trust
// model as e.g. a shipment tracking link). Only minimal fields are exposed
// — see getOrderStatus's select list.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const order = await getOrderStatus(id);

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({ order });
}

// Staff-only: drives an order through RECEIVE (-> CONFIRMED, prints the
// kitchen slip), COMPLETE (-> COMPLETED), or CANCEL (-> CANCELLED, reverses
// inventory deductions). See lib/orders.ts#updateOrderStatus for the
// transition rules and inventory-return logic.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = orderStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid status." }, { status: 400 });
  }

  try {
    const order = await updateOrderStatus(id, parsed.data.status, session.user.id);
    const serialized = serializePrisma(order);

    await publishKitchenEvent(KITCHEN_EVENTS.ORDER_UPDATED, serialized);

    // Only a RECEIVE (-> CONFIRMED) produces something to print — the
    // receipt payload the on-screen preview (and, later, the print bridge)
    // renders. Building it server-side keeps the customer-facing prices
    // and item names authoritative rather than trusting the client's copy.
    const receiptData = parsed.data.status === "CONFIRMED" ? toReceiptData(order) : null;
    const receipt = receiptData ? { data: receiptData, escPosBase64: buildReceiptEscPos(receiptData) } : null;

    return NextResponse.json({ order: serialized, receipt });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Order status update failed:", err);
    return NextResponse.json({ error: "Could not update the order. Please try again." }, { status: 500 });
  }
}
