import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getComboMeal, updateComboMeal, deleteComboMeal } from "@/lib/combos";
import { comboMealUpdateSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const combo = await getComboMeal(id);
  if (!combo) return NextResponse.json({ error: "Combo meal not found." }, { status: 404 });

  return NextResponse.json(serializePrisma(combo));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = comboMealUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const combo = await updateComboMeal(id, parsed.data);
    return NextResponse.json(serializePrisma(combo));
  } catch {
    return NextResponse.json({ error: "Could not update combo meal." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const result = await deleteComboMeal(id);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: `This combo has been ordered ${result.orderItemCount} time(s). Mark it unavailable instead of deleting so past receipts stay intact.`,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
