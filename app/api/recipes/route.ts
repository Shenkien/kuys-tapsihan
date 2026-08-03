import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getRecipe, createRecipe, calculateRecipeCost, checkRecipeAvailability } from "@/lib/recipes";
import { recipeSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const menuItemId = req.nextUrl.searchParams.get("menuItemId");
  if (!menuItemId) {
    return NextResponse.json({ error: "menuItemId query param is required." }, { status: 400 });
  }

  const [ingredients, cost, availability] = await Promise.all([
    getRecipe(menuItemId),
    calculateRecipeCost(menuItemId),
    checkRecipeAvailability(menuItemId),
  ]);

  return NextResponse.json(serializePrisma({ ingredients, cost, availability }));
}

const bodySchema = z.object({ menuItemId: z.string().min(1) }).and(recipeSchema);

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { menuItemId, ingredients } = parsed.data;
  const recipe = await createRecipe(menuItemId, ingredients);
  return NextResponse.json(serializePrisma(recipe), { status: 201 });
}
