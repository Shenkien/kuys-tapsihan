import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getAddOns, createAddOn } from "@/lib/addons";
import { addOnSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";
import { Prisma } from "@prisma/client";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const addOns = await getAddOns();
  return NextResponse.json(serializePrisma(addOns));
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = addOnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const addOn = await createAddOn(parsed.data);
    return NextResponse.json(serializePrisma(addOn), { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "An add-on with that name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create add-on." }, { status: 500 });
  }
}
