import { NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { adminResetPassword } from "@/lib/users";
import { logAudit } from "@/lib/audit";
import prisma from "@/lib/prisma";

// Admin-triggered reset: generates a temporary password and returns it
// once in the response — the admin is expected to relay it to the staff
// member directly (in person / chat), since there's no email service wired
// up yet. The staff member should change it after their next login.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const tempPassword = await adminResetPassword(id);

  await logAudit({
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "Admin",
    action: "USER_PASSWORD_RESET",
    entityType: "User",
    entityId: id,
    description: `Reset password for ${user.name} (${user.email})`,
  });

  return NextResponse.json({ tempPassword });
}
