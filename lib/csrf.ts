import { randomBytes, timingSafeEqual } from "crypto";

// Double-submit cookie CSRF protection for the custom /api/auth/register and
// /api/auth/check-email routes (NextAuth's own routes already have their own
// CSRF handling — this covers the routes we added on top of it).
//
// Flow:
//   1. Client calls GET /api/csrf on page load.
//   2. Server generates a random token, returns it in the JSON body AND sets
//      it as a readable (non-HttpOnly) cookie.
//   3. Client echoes the token back in a custom header on state-changing
//      requests (POST /api/auth/register).
//   4. Server compares the header value against the cookie value. A
//      cross-site attacker can trigger the request but cannot read the
//      cookie (same-origin policy) or set the custom header cross-site
//      without triggering a blocked CORS preflight, so a mismatch reveals
//      forged requests.

export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function verifyCsrfToken(
  cookieToken: string | undefined | null,
  headerToken: string | undefined | null
): boolean {
  if (!cookieToken || !headerToken) return false;
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
