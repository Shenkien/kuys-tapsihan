import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { logWaste, getWasteLog } from "@/lib/inventory";
import { wasteLogSchema } from "@/lib/validation";
import { serializePrisma } from "@/lib/serialize";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const log = await getWasteLog();
  return NextResponse.json(serializePrisma(log));
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const parsed = wasteLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const item = await logWaste(parsed.data);
    return NextResponse.json(serializePrisma(item), { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "Quantity is more than what's currently on hand." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not log waste/spoilage." }, { status: 500 });
  }
}
