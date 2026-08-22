import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { updateUser, UserManagementError } from "@/lib/users";
import { userUpdateSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";
import { logAudit } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const user = await updateUser(id, parsed.data, session.user.id);

    const changeSummary = [
      parsed.data.role !== undefined && `role → ${parsed.data.role}`,
      parsed.data.isActive !== undefined && (parsed.data.isActive ? "reactivated" : "deactivated"),
      parsed.data.name !== undefined && `renamed to "${parsed.data.name}"`,
    ]
      .filter(Boolean)
      .join(", ");

    await logAudit({
      actorId: session.user.id,
      actorName: session.user.name ?? session.user.email ?? "Admin",
      action: "USER_UPDATED",
      entityType: "User",
      entityId: id,
      description: `Updated ${user.name} (${user.email}): ${changeSummary || "no changes"}`,
    });

    return NextResponse.json(serializePrisma(user));
  } catch (err) {
    if (err instanceof UserManagementError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not update user." }, { status: 500 });
  }
}
