import prisma from "@/lib/prisma";

export function getSuppliers() {
  return prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { purchaseOrders: true } } },
  });
}

export function getSupplier(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}

export interface SupplierInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export function createSupplier(data: SupplierInput) {
  return prisma.supplier.create({
    data: {
      name: data.name.trim(),
      contactPerson: data.contactPerson?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
    },
  });
}

export function updateSupplier(id: string, data: Partial<SupplierInput>) {
  return prisma.supplier.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson?.trim() || null }),
      ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
      ...(data.email !== undefined && { email: data.email?.trim() || null }),
      ...(data.address !== undefined && { address: data.address?.trim() || null }),
    },
  });
}

/** Refuses to delete a supplier with purchase order history — same
 * intact-history principle used everywhere else (categories, tables,
 * combos): financial/procurement records should never disappear. */
export async function deleteSupplier(id: string) {
  const poCount = await prisma.purchaseOrder.count({ where: { supplierId: id } });
  if (poCount > 0) {
    return { ok: false as const, poCount };
  }

  await prisma.supplier.delete({ where: { id } });
  return { ok: true as const };
}
