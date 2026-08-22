import { NextRequest, NextResponse } from "next/server";
import { getBusinessSettings, updateBusinessSettings } from "@/lib/settings";
import { businessSettingsSchema } from "@/lib/validation";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { serializePrisma } from "@/lib/serialize";
import { logAudit } from "@/lib/audit";

// System Settings — Sales Configuration. Admin-only: tax rate, VAT mode,
// service charge rate, senior/PWD discount rate, and the Official Receipt
// number prefix all live here instead of being hardcoded.
export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const settings = await getBusinessSettings();
  return NextResponse.json(serializePrisma(settings));
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const body = await request.json().catch(() => null);
  const parsed = businessSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." }, { status: 400 });
  }

  const settings = await updateBusinessSettings(parsed.data);

  await logAudit({
    actorId: session.user.id,
    actorName: session.user.name ?? session.user.email ?? "Admin",
    action: "SETTINGS_UPDATED",
    entityType: "BusinessSettings",
    entityId: settings.id,
    description: `Updated business settings: ${Object.entries(parsed.data)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ")}`,
  });

  return NextResponse.json(serializePrisma(settings));
}
