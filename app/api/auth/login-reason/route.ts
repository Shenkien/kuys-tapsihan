import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { loginReasonSchema } from "@/lib/validation";

// This endpoint is called by the login page ONLY after next-auth's own
// signIn() has already rejected an attempt — it never authenticates a
// session itself. Its sole job is to turn a generic failure into a specific,
// friendly message ("Email does not exist" vs. "Password is incorrect").
//
// Security trade-off: distinguishing these two cases makes it possible to
// enumerate registered emails. That's an explicit, requested UX choice here;
// it's rate-limited per IP to slow down abuse. For a public-facing product
// where email enumeration is a concern, prefer a single generic message
// ("Invalid email or password") instead.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { ok } = rateLimit(`login-reason:${ip}`, 10, 60_000); // 10 / minute
  if (!ok) {
    return NextResponse.json({
      reason: "rate_limited",
      message: "Too many attempts. Please wait a moment and try again.",
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = loginReasonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      reason: "invalid",
      message: "Please enter a valid email and password.",
    });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json({ reason: "no_account", message: "Email does not exist." });
  }
  if (!user.isActive) {
    return NextResponse.json({
      reason: "inactive",
      message: "This account has been deactivated. Contact an admin.",
    });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return NextResponse.json({ reason: "wrong_password", message: "Password is incorrect." });
  }

  // Password and email were actually fine — signIn() must have failed for
  // another reason (e.g. a transient error). Give a generic fallback.
  return NextResponse.json({ reason: "unknown", message: "Sign-in failed. Please try again." });
}
