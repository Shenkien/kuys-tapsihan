-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_menuItemId_fkey";

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'Uncategorized',
ADD COLUMN     "unitCost" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isNew" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "comboMealId" TEXT,
ALTER COLUMN "menuItemId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "add_ons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "add_ons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_meals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combo_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_meal_items" (
    "id" TEXT NOT NULL,
    "comboMealId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "combo_meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_add_ons" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "order_item_add_ons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "add_ons_name_key" ON "add_ons"("name");

-- CreateIndex
CREATE UNIQUE INDEX "combo_meal_items_comboMealId_menuItemId_key" ON "combo_meal_items"("comboMealId", "menuItemId");

-- CreateIndex
CREATE INDEX "order_item_add_ons_orderItemId_idx" ON "order_item_add_ons"("orderItemId");

-- CreateIndex
CREATE INDEX "inventory_items_category_idx" ON "inventory_items"("category");

-- CreateIndex
CREATE INDEX "menu_items_deletedAt_idx" ON "menu_items"("deletedAt");

-- CreateIndex
CREATE INDEX "order_items_comboMealId_idx" ON "order_items"("comboMealId");

-- AddForeignKey
ALTER TABLE "combo_meal_items" ADD CONSTRAINT "combo_meal_items_comboMealId_fkey" FOREIGN KEY ("comboMealId") REFERENCES "combo_meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_meal_items" ADD CONSTRAINT "combo_meal_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_comboMealId_fkey" FOREIGN KEY ("comboMealId") REFERENCES "combo_meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_add_ons" ADD CONSTRAINT "order_item_add_ons_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
