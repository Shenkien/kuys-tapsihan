import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken, ResetTokenError } from "@/lib/password-reset";
import { resetPasswordSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { ok, retryAfterMs } = rateLimit(`reset-password:${ip}`, 10, 15 * 60_000);
  if (!ok) {
    return NextResponse.json(
      { error: `Too many attempts. Please try again in ${Math.ceil(retryAfterMs / 60_000)} minute(s).` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    await resetPasswordWithToken(parsed.data.token, parsed.data.newPassword);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof ResetTokenError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not reset password. Please try again." }, { status: 500 });
  }
}
