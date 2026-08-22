import { NextResponse } from "next/server";
import { closeShift, getShiftCloseHistory, OrderError } from "@/lib/orders";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { serializePrisma } from "@/lib/serialize";
import { logAudit } from "@/lib/audit";

// End-of-Day Cash Reconciliation (Z-Reading) Module — Admin-only. A Z-Read
// is a one-way, permanent close-out of a period's sales, so it's kept at
// the same permission tier as refunds.
export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const history = await getShiftCloseHistory();
  return NextResponse.json({ closes: serializePrisma(history) });
}

export async function POST() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  try {
    const close = await closeShift(session.user.id);

    await logAudit({
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email ?? "Admin",
      action: "SHIFT_CLOSED",
      entityType: "ShiftClose",
      entityId: close.id,
      description: `Closed shift: ${close.orderCount} orders, gross sales ₱${Number(close.grossSales).toFixed(2)}`,
    });

    return NextResponse.json({ close: serializePrisma(close) }, { status: 201 });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Shift close failed:", err);
    return NextResponse.json({ error: "Could not close the shift. Please try again." }, { status: 500 });
  }
}
