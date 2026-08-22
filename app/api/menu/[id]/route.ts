import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import {
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  toggleBestSeller,
  toggleNew,
} from "@/lib/menu";
import { menuItemSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const item = await getMenuItem(id);
  if (!item) return NextResponse.json({ error: "Menu item not found." }, { status: 404 });

  return NextResponse.json(serializePrisma(item));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = menuItemSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const before = await getMenuItem(id);
    const item = await updateMenuItem(id, parsed.data);

    // Price changes get their own audit entry — the classic "who changed
    // the price and when" question a food business owner actually asks.
    if (before && parsed.data.price !== undefined && Number(before.price) !== parsed.data.price) {
      await logAudit({
        actorId: session.user.id,
        actorName: session.user.name ?? session.user.email ?? "Admin",
        action: "MENU_PRICE_CHANGED",
        entityType: "MenuItem",
        entityId: id,
        description: `${item.name}: ₱${Number(before.price).toFixed(2)} → ₱${parsed.data.price.toFixed(2)}`,
      });
    }

    return NextResponse.json(serializePrisma(item));
  } catch {
    return NextResponse.json({ error: "Could not update menu item." }, { status: 500 });
  }
}

const toggleSchema = z.object({
  field: z.enum(["isAvailable", "isBestSeller", "isNew"]),
  value: z.boolean(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "field must be isAvailable/isBestSeller/isNew and value a boolean." }, { status: 400 });
  }

  const { field, value } = parsed.data;
  const item =
    field === "isAvailable"
      ? await toggleAvailability(id, value)
      : field === "isBestSeller"
        ? await toggleBestSeller(id, value)
        : await toggleNew(id, value);

  return NextResponse.json(serializePrisma(item));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  try {
    const result = await deleteMenuItem(id);
    return NextResponse.json({ success: true, mode: result.mode });
  } catch {
    return NextResponse.json({ error: "Could not delete menu item." }, { status: 500 });
  }
}
