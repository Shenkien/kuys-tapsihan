import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function getRecipe(menuItemId: string) {
  return prisma.menuItemIngredient.findMany({
    where: { menuItemId },
    include: { inventoryItem: true },
    orderBy: { inventoryItem: { name: "asc" } },
  });
}

export interface RecipeIngredientInput {
  inventoryItemId: string;
  quantityUsed: number;
}

/** Replaces the entire recipe with the given ingredient list. */
async function replaceRecipe(menuItemId: string, ingredients: RecipeIngredientInput[]) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.menuItemIngredient.deleteMany({ where: { menuItemId } });
    if (ingredients.length > 0) {
      await tx.menuItemIngredient.createMany({
        data: ingredients.map((i) => ({
          menuItemId,
          inventoryItemId: i.inventoryItemId,
          quantityUsed: i.quantityUsed,
        })),
      });
    }
    return tx.menuItemIngredient.findMany({
      where: { menuItemId },
      include: { inventoryItem: true },
    });
  });
}

export function createRecipe(menuItemId: string, ingredients: RecipeIngredientInput[]) {
  return replaceRecipe(menuItemId, ingredients);
}

export function updateRecipe(menuItemId: string, ingredients: RecipeIngredientInput[]) {
  return replaceRecipe(menuItemId, ingredients);
}

export function deleteRecipe(menuItemId: string) {
  return prisma.menuItemIngredient.deleteMany({ where: { menuItemId } });
}

export function getIngredientUsage(inventoryItemId: string) {
  return prisma.menuItemIngredient.findMany({
    where: { inventoryItemId },
    include: { menuItem: { include: { category: true } } },
  });
}

export async function calculateRecipeCost(menuItemId: string) {
  const ingredients = await prisma.menuItemIngredient.findMany({
    where: { menuItemId },
    include: { inventoryItem: true },
  });

  return ingredients.reduce((total, ing) => {
    const unitCost = ing.inventoryItem.unitCost ? Number(ing.inventoryItem.unitCost) : 0;
    return total + unitCost * Number(ing.quantityUsed);
  }, 0);
}

/** Checks whether current stock supports `orderQuantity` orders of this menu item. */
export async function checkRecipeAvailability(menuItemId: string, orderQuantity = 1) {
  const ingredients = await prisma.menuItemIngredient.findMany({
    where: { menuItemId },
    include: { inventoryItem: true },
  });

  const insufficient = ingredients.filter(
    (ing) => Number(ing.inventoryItem.quantityOnHand) < Number(ing.quantityUsed) * orderQuantity
  );

  return {
    available: insufficient.length === 0,
    insufficient: insufficient.map((ing) => ({
      inventoryItemId: ing.inventoryItemId,
      name: ing.inventoryItem.name,
      needed: Number(ing.quantityUsed) * orderQuantity,
      onHand: Number(ing.inventoryItem.quantityOnHand),
    })),
  };
}

/**
 * Deducts every ingredient's recipe quantity (× orderQuantity) from
 * inventory in one atomic transaction — called when an order is placed.
 * Throws INSUFFICIENT_STOCK (and rolls back) if any ingredient runs short.
 */
export async function autoDeductInventory(
  menuItemId: string,
  orderQuantity: number,
  orderId?: string
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const ingredients = await tx.menuItemIngredient.findMany({
      where: { menuItemId },
      include: { inventoryItem: true },
    });

    for (const ing of ingredients) {
      const needed = Number(ing.quantityUsed) * orderQuantity;
      const onHand = Number(ing.inventoryItem.quantityOnHand);
      if (onHand < needed) {
        throw new Error(`INSUFFICIENT_STOCK:${ing.inventoryItem.name}`);
      }
    }

    for (const ing of ingredients) {
      const needed = Number(ing.quantityUsed) * orderQuantity;
      await tx.inventoryItem.update({
        where: { id: ing.inventoryItemId },
        data: { quantityOnHand: { decrement: needed } },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: ing.inventoryItemId,
          type: "DEDUCTION",
          quantity: needed,
          orderId: orderId || null,
        },
      });
    }

    return { deducted: ingredients.length };
  });
}
