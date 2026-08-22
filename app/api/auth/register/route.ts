import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { registerSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf";

const BCRYPT_ROUNDS = 12;

export async function POST(req: NextRequest) {
  // --- CSRF ---
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  if (!verifyCsrfToken(cookieToken, headerToken)) {
    return NextResponse.json(
      { error: "Your session expired. Please refresh the page and try again." },
      { status: 403 }
    );
  }

  // --- Rate limiting (per IP, prevents registration spam / abuse) ---
  const ip = getClientIp(req);
  const { ok, retryAfterMs } = rateLimit(`register:${ip}`, 5, 10 * 60_000); // 5 / 10 min
  if (!ok) {
    return NextResponse.json(
      {
        error: `Too many registration attempts. Please try again in ${Math.ceil(
          retryAfterMs / 60_000
        )} minute(s).`,
      },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message ?? "Please check the form and try again.",
        field: firstIssue?.path?.[0],
      },
      { status: 400 }
    );
  }

  const { name, email, password, role } = parsed.data;

  // --- Role escalation guard: only a signed-in Admin can create another Admin ---
  let finalRole: "ADMIN" | "STAFF" = "STAFF";
  if (role === "ADMIN") {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only an existing Admin can create another Admin account.", field: "role" },
        { status: 403 }
      );
    }
    finalRole = "ADMIN";
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email is already registered.", field: "email" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: finalRole },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ success: true, user }, { status: 201 });
}
