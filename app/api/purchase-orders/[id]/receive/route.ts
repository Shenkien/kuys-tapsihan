import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { receivePurchaseOrder, PurchaseOrderError } from "@/lib/purchase-orders";
import { serializePrisma } from "@/lib/serialize";
import { logAudit } from "@/lib/audit";

// Confirms delivery and restocks every line item in one transaction — see
// lib/purchase-orders.ts#receivePurchaseOrder for how this ties into the
// Stock Transaction Module.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  try {
    const po = await receivePurchaseOrder(id);

    await logAudit({
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email ?? "Admin",
      action: "PURCHASE_ORDER_RECEIVED",
      entityType: "PurchaseOrder",
      entityId: id,
      description: `Received ${po.poNumber} from ${po.supplier.name} — restocked ${po.items.length} item(s)`,
    });

    return NextResponse.json(serializePrisma(po));
  } catch (err) {
    if (err instanceof PurchaseOrderError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not receive purchase order." }, { status: 500 });
  }
}
