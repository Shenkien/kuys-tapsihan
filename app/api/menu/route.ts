import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getMenuItems, createMenuItem, searchMenuItems, filterMenuItems } from "@/lib/menu";
import { menuItemSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.trim();
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const status = searchParams.get("status") as
    | "available"
    | "unavailable"
    | "best_seller"
    | "new"
    | null;

  let items;
  if (search) {
    items = await searchMenuItems(search);
  } else if (categoryId || status) {
    items = await filterMenuItems({ categoryId, status: status ?? undefined });
  } else {
    items = await getMenuItems();
  }

  return NextResponse.json(serializePrisma(items));
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = menuItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const item = await createMenuItem(parsed.data);
    return NextResponse.json(serializePrisma(item), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create menu item." }, { status: 500 });
  }
}
