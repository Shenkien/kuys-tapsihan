import { NextResponse } from "next/server";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "@/lib/csrf";

export async function GET() {
  const token = generateCsrfToken();

  const res = NextResponse.json({ csrfToken: token });
  res.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // must be readable by client JS for the double-submit check
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30, // 30 minutes
  });

  return res;
}
