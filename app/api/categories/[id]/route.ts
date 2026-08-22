import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { updateCategory, deleteCategory, getCategoryItems } from "@/lib/categories";
import { categorySchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";
import { Prisma } from "@prisma/client";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const items = await getCategoryItems(id);
  return NextResponse.json(serializePrisma(items));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = categorySchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const category = await updateCategory(id, parsed.data);
    return NextResponse.json(serializePrisma(category));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not update category." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const result = await deleteCategory(id);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: `This category still has ${result.itemCount} menu item(s) linked to it. Move or delete them first.`,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
