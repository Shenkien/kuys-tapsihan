import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getSuppliers, createSupplier } from "@/lib/suppliers";
import { supplierSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";
import { Prisma } from "@prisma/client";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const suppliers = await getSuppliers();
  return NextResponse.json(serializePrisma(suppliers));
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const supplier = await createSupplier(parsed.data);
    return NextResponse.json(serializePrisma(supplier), { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A supplier with that name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create supplier." }, { status: 500 });
  }
}
