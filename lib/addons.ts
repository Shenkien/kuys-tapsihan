import prisma from "@/lib/prisma";

export function getAddOns() {
  return prisma.addOn.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export interface AddOnInput {
  name: string;
  price: number;
  isAvailable?: boolean;
  sortOrder?: number;
}

export function createAddOn(data: AddOnInput) {
  return prisma.addOn.create({
    data: {
      name: data.name.trim(),
      price: data.price,
      isAvailable: data.isAvailable ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

export function updateAddOn(id: string, data: Partial<AddOnInput>) {
  return prisma.addOn.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });
}

// No usage guard needed here — OrderItemAddOn intentionally snapshots the
// name/price rather than holding a foreign key to AddOn (see schema
// comment), so deleting an add-on can never orphan or corrupt a past order.
export async function deleteAddOn(id: string) {
  await prisma.addOn.delete({ where: { id } });
}
