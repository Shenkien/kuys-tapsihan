import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getComboMeals, createComboMeal } from "@/lib/combos";
import { comboMealSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const combos = await getComboMeals();
  return NextResponse.json(serializePrisma(combos));
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = comboMealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const combo = await createComboMeal(parsed.data);
    return NextResponse.json(serializePrisma(combo), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create combo meal." }, { status: 500 });
  }
}
