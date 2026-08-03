import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Every menu/category/inventory/recipe API route is Admin-only. Call this
 * first thing in each handler; if it returns a NextResponse, return that
 * immediately. Otherwise you get back the authenticated session.
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  return session;
}

export function isErrorResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}
