import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { updateSupplier, deleteSupplier } from "@/lib/suppliers";
import { supplierUpdateSchema } from "@/lib/validation";
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
  const parsed = supplierUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const supplier = await updateSupplier(id, parsed.data);
    return NextResponse.json(serializePrisma(supplier));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A supplier with that name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not update supplier." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const result = await deleteSupplier(id);

  if (!result.ok) {
    return NextResponse.json(
      { error: `This supplier has ${result.poCount} purchase order(s) on record and can't be deleted.` },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
