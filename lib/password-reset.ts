import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const TOKEN_TTL_MS = 30 * 60_000; // 30 minutes
const BCRYPT_ROUNDS = 12;

function hashToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Issues a reset token for the given email, IF an account with that email
 * exists. Always looks and behaves the same either way from the caller's
 * perspective (the API route returns the same generic message regardless)
 * to avoid leaking which emails are registered — see the route for how the
 * raw token gets surfaced back to the person, since there's no email
 * service wired up to send it automatically yet.
 */
export async function createPasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) return null;

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  return { rawToken, userName: user.name };
}

export class ResetTokenError extends Error {}

export async function resetPasswordWithToken(rawToken: string, newPassword: string) {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record) throw new ResetTokenError("This reset link is invalid.");
  if (record.usedAt) throw new ResetTokenError("This reset link has already been used.");
  if (record.expiresAt < new Date()) throw new ResetTokenError("This reset link has expired. Please request a new one.");

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}
