import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getTables, createTable } from "@/lib/tables";
import { tableSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";
import { Prisma } from "@prisma/client";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const tables = await getTables();
  return NextResponse.json(serializePrisma(tables));
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = tableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const table = await createTable(parsed.data);
    return NextResponse.json(serializePrisma(table), { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A table with that number already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create table." }, { status: 500 });
  }
}
