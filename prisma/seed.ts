import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Admin user ---
  const adminPasswordHash = await bcrypt.hash("ChangeMe123!", 10);
  await prisma.user.upsert({
    where: { email: "owner@kuystapsihan.ph" },
    update: {},
    create: {
      name: "KUY'S Tapsihan Owner",
      email: "owner@kuystapsihan.ph",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const staffPasswordHash = await bcrypt.hash("ChangeMe123!", 10);
  await prisma.user.upsert({
    where: { email: "kitchen@kuystapsihan.ph" },
    update: {},
    create: {
      name: "Kitchen Staff",
      email: "kitchen@kuystapsihan.ph",
      passwordHash: staffPasswordHash,
      role: "STAFF",
    },
  });

  // --- Categories ---
  const silogCategory = await prisma.category.upsert({
    where: { name: "Silog Meals" },
    update: {},
    create: { name: "Silog Meals", sortOrder: 1 },
  });

  const beveragesCategory = await prisma.category.upsert({
    where: { name: "Beverages" },
    update: {},
    create: { name: "Beverages", sortOrder: 2 },
  });

  // --- Inventory items ---
  const [rice, egg, beefTapa, longganisa, hotdog, softdrink] = await Promise.all([
    prisma.inventoryItem.upsert({
      where: { name: "Rice" },
      update: {},
      create: { name: "Rice", unit: "cup", quantityOnHand: 200, reorderThreshold: 30 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: "Egg" },
      update: {},
      create: { name: "Egg", unit: "pcs", quantityOnHand: 150, reorderThreshold: 20 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: "Beef Tapa" },
      update: {},
      create: { name: "Beef Tapa", unit: "pcs", quantityOnHand: 60, reorderThreshold: 10 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: "Longganisa" },
      update: {},
      create: { name: "Longganisa", unit: "pcs", quantityOnHand: 80, reorderThreshold: 10 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: "Hotdog" },
      update: {},
      create: { name: "Hotdog", unit: "pcs", quantityOnHand: 80, reorderThreshold: 10 },
    }),
    prisma.inventoryItem.upsert({
      where: { name: "Softdrink Can" },
      update: {},
      create: { name: "Softdrink Can", unit: "pcs", quantityOnHand: 100, reorderThreshold: 15 },
    }),
  ]);

  // --- Menu items + recipes (MenuItemIngredient) ---
  const tapsilog = await prisma.menuItem.create({
    data: {
      name: "Tapsilog",
      description: "Beef tapa, garlic rice, and fried egg.",
      price: 110.0,
      categoryId: silogCategory.id,
      ingredients: {
        create: [
          { inventoryItemId: rice.id, quantityUsed: 1 },
          { inventoryItemId: egg.id, quantityUsed: 1 },
          { inventoryItemId: beefTapa.id, quantityUsed: 1 },
        ],
      },
    },
  });

  const longsilog = await prisma.menuItem.create({
    data: {
      name: "Longsilog",
      description: "Sweet longganisa, garlic rice, and fried egg.",
      price: 95.0,
      categoryId: silogCategory.id,
      ingredients: {
        create: [
          { inventoryItemId: rice.id, quantityUsed: 1 },
          { inventoryItemId: egg.id, quantityUsed: 1 },
          { inventoryItemId: longganisa.id, quantityUsed: 1 },
        ],
      },
    },
  });

  const hotsilog = await prisma.menuItem.create({
    data: {
      name: "Hotsilog",
      description: "Hotdog, garlic rice, and fried egg.",
      price: 85.0,
      categoryId: silogCategory.id,
      ingredients: {
        create: [
          { inventoryItemId: rice.id, quantityUsed: 1 },
          { inventoryItemId: egg.id, quantityUsed: 1 },
          { inventoryItemId: hotdog.id, quantityUsed: 1 },
        ],
      },
    },
  });

  const softdrinkItem = await prisma.menuItem.create({
    data: {
      name: "Softdrink",
      description: "Ice cold canned soft drink.",
      price: 35.0,
      categoryId: beveragesCategory.id,
      ingredients: {
        create: [{ inventoryItemId: softdrink.id, quantityUsed: 1 }],
      },
    },
  });

  // --- Add-ons (global catalog, offered on every item) ---
  await Promise.all([
    prisma.addOn.upsert({
      where: { name: "Extra Rice" },
      update: {},
      create: { name: "Extra Rice", price: 20.0, sortOrder: 1 },
    }),
    prisma.addOn.upsert({
      where: { name: "Extra Egg" },
      update: {},
      create: { name: "Extra Egg", price: 20.0, sortOrder: 2 },
    }),
    prisma.addOn.upsert({
      where: { name: "Iced Tea" },
      update: {},
      create: { name: "Iced Tea", price: 30.0, sortOrder: 3 },
    }),
    prisma.addOn.upsert({
      where: { name: "Softdrink" },
      update: {},
      create: { name: "Softdrink", price: 35.0, sortOrder: 4 },
    }),
  ]);

  // --- Combo meal (bundled at a discount vs. buying items separately) ---
  await prisma.comboMeal.create({
    data: {
      name: "Tapsilog Combo",
      description: "Tapsilog paired with an ice-cold softdrink.",
      price: 130.0, // vs. 110 (Tapsilog) + 35 (Softdrink) = 145 bought separately
      items: {
        create: [
          { menuItemId: tapsilog.id, quantity: 1 },
          { menuItemId: softdrinkItem.id, quantity: 1 },
        ],
      },
    },
  });

  // --- Sample dining tables ---
  await prisma.diningTable.createMany({
    data: [
      { tableNumber: "T1" },
      { tableNumber: "T2" },
      { tableNumber: "T3" },
      { tableNumber: "T4" },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seed complete.");
  console.log(`   Menu items created: ${tapsilog.name}, ${longsilog.name}, ${hotsilog.name}, Softdrink`);
  console.log("   Admin login: owner@kuystapsihan.ph / ChangeMe123!");
  console.log("   Staff login: kitchen@kuystapsihan.ph / ChangeMe123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
