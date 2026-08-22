import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { updateTable, deleteTable } from "@/lib/tables";
import { tableUpdateSchema } from "@/lib/validation";
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
  const parsed = tableUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const table = await updateTable(id, parsed.data);
    return NextResponse.json(serializePrisma(table));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A table with that number already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not update table." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const result = await deleteTable(id);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: `This table has ${result.orderCount} order(s) on record. Deactivate it instead of deleting so order history stays intact.`,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
