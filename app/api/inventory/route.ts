import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getInventoryItems, createInventoryItem, getInventoryByCategory } from "@/lib/inventory";
import { inventoryItemSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const category = req.nextUrl.searchParams.get("category");
  const items = category ? await getInventoryByCategory(category) : await getInventoryItems();
  return NextResponse.json(serializePrisma(items));
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = inventoryItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const item = await createInventoryItem(parsed.data);
    return NextResponse.json(serializePrisma(item), { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "An inventory item with that name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create inventory item." }, { status: 500 });
  }
}
