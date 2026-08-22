import { NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getEoqSuggestions } from "@/lib/inventory";
import { serializePrisma } from "@/lib/serialize";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const suggestions = await getEoqSuggestions();
  return NextResponse.json(serializePrisma(suggestions));
}
