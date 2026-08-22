import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/password-reset";
import { forgotPasswordSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// Always returns the same generic message whether or not the email is
// registered, to avoid leaking which emails have accounts. Because no
// email service is wired up yet, the reset link itself IS returned in the
// response when the account exists — a real deployment would instead email
// it (e.g. via Resend/Nodemailer) and never put it in the API response.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { ok, retryAfterMs } = rateLimit(`forgot-password:${ip}`, 5, 15 * 60_000);
  if (!ok) {
    return NextResponse.json(
      { error: `Too many attempts. Please try again in ${Math.ceil(retryAfterMs / 60_000)} minute(s).` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const result = await createPasswordResetToken(parsed.data.email);

  const genericMessage = "If an account exists for that email, a reset link has been generated.";

  if (!result) {
    return NextResponse.json({ message: genericMessage });
  }

  const origin = req.nextUrl.origin;
  const resetUrl = `${origin}/reset-password?token=${result.rawToken}`;

  return NextResponse.json({ message: genericMessage, resetUrl, userName: result.userName });
}
