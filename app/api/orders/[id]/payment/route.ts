import { NextRequest, NextResponse } from "next/server";
import { markOrderPaid, toReceiptData, OrderError } from "@/lib/orders";
import { markOrderPaidSchema } from "@/lib/validation";
import { requireStaff, isErrorResponse } from "@/lib/staff-guard";
import { serializePrisma } from "@/lib/serialize";
import { buildOfficialReceiptEscPos } from "@/lib/receipt";
import { publishOrderStatusEvent } from "@/lib/pusher-server";

// Payment Transaction Module — Staff or Admin can confirm a payment (either
// role may run the till at a small tapsihan). Separate endpoint from the
// general order status PATCH: confirming payment is a financial action with
// its own validation (discount eligibility, receipt numbering) rather than
// just another kitchen-queue status transition.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = markOrderPaidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payment details." }, { status: 400 });
  }

  try {
    const order = await markOrderPaid(
      id,
      {
        paymentMethod: parsed.data.paymentMethod,
        discountType: parsed.data.discountType,
        discountReason: parsed.data.discountReason || undefined,
        discountAmount: parsed.data.discountAmount,
      },
      session.user.id
    );
    const serialized = serializePrisma(order);

    await publishOrderStatusEvent(id, { status: serialized.status, paymentStatus: serialized.paymentStatus });

    const receiptData = toReceiptData(order);
    const officialReceipt = {
      data: {
        ...receiptData,
        receiptNumber: order.receiptNumber,
        taxAmount: Number(order.taxAmount),
        serviceChargeAmount: Number(order.serviceChargeAmount),
        discountType: order.discountType,
        discountAmount: Number(order.discountAmount),
        discountReason: order.discountReason,
        paymentMethod: order.paymentMethod,
      },
      escPosBase64: buildOfficialReceiptEscPos({
        ...receiptData,
        receiptNumber: order.receiptNumber ?? "",
        taxAmount: Number(order.taxAmount),
        serviceChargeAmount: Number(order.serviceChargeAmount),
        discountType: order.discountType,
        discountAmount: Number(order.discountAmount),
        discountReason: order.discountReason,
        paymentMethod: order.paymentMethod,
      }),
    };

    return NextResponse.json({ order: serialized, receipt: officialReceipt });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Marking order paid failed:", err);
    return NextResponse.json({ error: "Could not confirm payment. Please try again." }, { status: 500 });
  }
}
