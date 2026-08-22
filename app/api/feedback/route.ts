import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getFeedbackList } from "@/lib/feedback";
import { serializePrisma } from "@/lib/serialize";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const params = request.nextUrl.searchParams;
  const result = await getFeedbackList({
    page: params.get("page") ? Number(params.get("page")) : undefined,
  });

  return NextResponse.json(serializePrisma(result));
}
