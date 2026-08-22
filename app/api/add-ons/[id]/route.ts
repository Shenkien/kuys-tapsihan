import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { updateAddOn, deleteAddOn } from "@/lib/addons";
import { addOnUpdateSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";
import { Prisma } from "@prisma/client";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = addOnUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const addOn = await updateAddOn(id, parsed.data);
    return NextResponse.json(serializePrisma(addOn));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "An add-on with that name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not update add-on." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  await deleteAddOn(id);
  return NextResponse.json({ success: true });
}
