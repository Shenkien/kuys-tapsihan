import { NextResponse } from "next/server";
import { requireAdmin, isErrorResponse } from "@/lib/admin-guard";
import { getUsers } from "@/lib/users";
import { serializePrisma } from "@/lib/serialize";

export async function GET() {
  const session = await requireAdmin();
  if (isErrorResponse(session)) return session;

  const users = await getUsers();
  return NextResponse.json(serializePrisma(users));
}
