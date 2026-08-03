import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validation";
import { createOrder, getKitchenQueue, OrderError } from "@/lib/orders";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { requireStaff, isErrorResponse } from "@/lib/staff-guard";
import { serializePrisma } from "@/lib/serialize";
import { publishKitchenEvent, KITCHEN_EVENTS } from "@/lib/pusher-server";

// Staff-only: the initial snapshot the kitchen queue page loads on mount,
// before Pusher events start keeping it live.
export async function GET() {
  const session = await requireStaff();
  if (isErrorResponse(session)) return session;

  const orders = await getKitchenQueue();
  return NextResponse.json({ orders: serializePrisma(orders) });
}

// Guest-facing endpoint — no login required (customers order anonymously
// from the kiosk or by scanning a table's QR code). Rate-limited per IP to
// blunt spam/abuse since there's no auth to key off of.
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(`create-order:${ip}`, 15, 10 * 60_000); // 15 orders / 10 min / IP
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many orders placed from this device recently. Please wait a bit and try again." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid order." },
      { status: 400 }
    );
  }

  const { channel, tableToken, customerName, paymentMethod, notes, items } = parsed.data;

  let tableId: string | null = null;
  if (channel === "QR") {
    if (!tableToken) {
      return NextResponse.json({ error: "Missing table information. Please rescan the QR code." }, { status: 400 });
    }
    const table = await prisma.diningTable.findUnique({ where: { qrCodeToken: tableToken } });
    if (!table || !table.isActive) {
      return NextResponse.json(
        { error: "This table's QR code is no longer active. Please ask staff for help." },
        { status: 400 }
      );
    }
    tableId = table.id;
  }

  try {
    const order = await createOrder({
      channel,
      tableId,
      customerName,
      paymentMethod,
      notes,
      items: items.map((i) => ({
        menuItemId: i.menuItemId,
        comboMealId: i.comboMealId,
        quantity: i.quantity,
        notes: i.notes,
        addOns: i.addOns,
      })),
    });

    // Order is already committed to Postgres — fetch it back with the
    // shape the kitchen queue needs and push it to staff screens. This is
    // deliberately outside the createOrder transaction and fire-and-forget
    // (see publishKitchenEvent): a Pusher hiccup should never fail an
    // order the customer has already been told is placed.
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            menuItem: { select: { name: true } },
            comboMeal: { select: { name: true } },
            addOns: true,
          },
        },
        table: { select: { tableNumber: true } },
      },
    });
    if (fullOrder) {
      await publishKitchenEvent(KITCHEN_EVENTS.ORDER_NEW, serializePrisma(fullOrder));
    }

    return NextResponse.json(
      {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: order.totalAmount,
          table: order.table,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Order creation failed:", err);
    return NextResponse.json(
      { error: "Something went wrong placing your order. Please try again or ask staff for help." },
      { status: 500 }
    );
  }
}
