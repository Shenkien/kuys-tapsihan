import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { emailCheckSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { ok } = rateLimit(`check-email:${ip}`, 30, 60_000); // 30 requests / minute
  if (!ok) {
    return NextResponse.json(
      { available: false, valid: false, error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  const email = req.nextUrl.searchParams.get("email") ?? "";
  const parsed = emailCheckSchema.safeParse({ email });

  if (!parsed.success) {
    return NextResponse.json({ available: false, valid: false });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing, valid: true });
}
