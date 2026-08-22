import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getAuditLog } from "@/lib/audit";
import { serializePrisma } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const params = request.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");

  const result = await getAuditLog({
    entityType: params.get("entityType") || undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    page: params.get("page") ? Number(params.get("page")) : undefined,
  });

  return NextResponse.json(serializePrisma(result));
}
