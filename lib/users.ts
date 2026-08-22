import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const BCRYPT_ROUNDS = 12;

export function getUsers() {
  return prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export interface UpdateUserInput {
  name?: string;
  role?: "ADMIN" | "STAFF";
  isActive?: boolean;
}

export class UserManagementError extends Error {}

/** Blocks an Admin from locking themselves out — deactivating their own
 * account or demoting themselves to Staff while they're the one making
 * the request. */
export async function updateUser(id: string, data: UpdateUserInput, actingUserId: string) {
  if (id === actingUserId) {
    if (data.isActive === false) throw new UserManagementError("You can't deactivate your own account.");
    if (data.role === "STAFF") throw new UserManagementError("You can't demote your own account.");
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
}

/** Admin-triggered password reset: generates a random temporary password,
 * hashes it, and returns the plaintext once so the admin can hand it to
 * the staff member directly — distinct from the self-service
 * Forgot/Reset Password flow, which the user drives themselves. */
export async function adminResetPassword(id: string) {
  const tempPassword = Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

  await prisma.user.update({ where: { id }, data: { passwordHash } });
  return tempPassword;
}
