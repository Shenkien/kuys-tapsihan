import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import {
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  restockItem,
  deductStock,
  updateStock,
} from "@/lib/inventory";
import { inventoryItemSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";
import { z } from "zod";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const item = await getInventoryItem(id);
  if (!item) return NextResponse.json({ error: "Inventory item not found." }, { status: 404 });

  return NextResponse.json(serializePrisma(item));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = inventoryItemSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const item = await updateInventoryItem(id, parsed.data);
    return NextResponse.json(serializePrisma(item));
  } catch {
    return NextResponse.json({ error: "Could not update inventory item." }, { status: 500 });
  }
}

const stockActionSchema = z
  .object({
    action: z.enum(["restock", "deduct", "adjust"]),
    quantity: z.coerce.number().refine((n) => n !== 0, "Quantity can't be zero."),
    note: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((data) => data.action === "adjust" || data.quantity > 0, {
    message: "Quantity must be greater than 0 for restock/deduct.",
    path: ["quantity"],
  });

/** Stock movement (not detail edits) — keeps an InventoryTransaction audit trail. */
export async function POST(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = stockActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { action, quantity, note } = parsed.data;

  try {
    const item =
      action === "restock"
        ? await restockItem(id, quantity, note)
        : action === "deduct"
          ? await deductStock(id, quantity)
          : await updateStock(id, quantity, note); // "adjust": quantity is a signed delta

    return NextResponse.json(serializePrisma(item));
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "Not enough stock for that deduction." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not update stock." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  try {
    await deleteInventoryItem(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Could not delete — this item may still be used in a recipe." },
      { status: 409 }
    );
  }
}
