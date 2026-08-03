import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import {
  getRecipe,
  updateRecipe,
  deleteRecipe,
  calculateRecipeCost,
  checkRecipeAvailability,
} from "@/lib/recipes";
import { recipeSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";

interface Params {
  // `id` here is the menuItemId — a recipe is 1:many rows keyed by the menu item.
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const [ingredients, cost, availability] = await Promise.all([
    getRecipe(id),
    calculateRecipeCost(id),
    checkRecipeAvailability(id),
  ]);

  return NextResponse.json(serializePrisma({ ingredients, cost, availability }));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = recipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const recipe = await updateRecipe(id, parsed.data.ingredients);
  return NextResponse.json(serializePrisma(recipe));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  await deleteRecipe(id);
  return NextResponse.json({ success: true });
}
