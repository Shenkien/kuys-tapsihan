import { NextResponse } from "next/server";
import { auth } from "@/auth";

/** Kitchen-queue API routes are Admin OR Staff (owners can also run the
 * queue). Call first thing in each handler; if it returns a NextResponse,
 * return that immediately — otherwise you get the authenticated session. */
export async function requireStaff() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
    return NextResponse.json({ error: "Staff access required." }, { status: 403 });
  }

  return session;
}

export function isErrorResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}
