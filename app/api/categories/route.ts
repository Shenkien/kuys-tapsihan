import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getCategories, createCategory } from "@/lib/categories";
import { categorySchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";
import { Prisma } from "@prisma/client";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const categories = await getCategories();
  return NextResponse.json(serializePrisma(categories));
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const category = await createCategory(parsed.data);
    return NextResponse.json(serializePrisma(category), { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A category with that name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create category." }, { status: 500 });
  }
}
