"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { passwordRequirements, getPasswordStrength } from "@/lib/validation";
import { LogoStacked } from "@/components/logo";

type EmailStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

// Small debounce hook — waits `delay` ms of no changes before updating.
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const debouncedEmail = useDebouncedValue(email.trim().toLowerCase(), 500);

  // Auto-focus the first field on load.
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Fetch a CSRF token once on mount for the eventual submit request.
  useEffect(() => {
    fetch("/api/csrf")
      .then((r) => r.json())
      .then((data) => setCsrfToken(data.csrfToken))
      .catch(() => setCsrfToken(null));
  }, []);

  // Debounced email availability check.
  useEffect(() => {
    if (!debouncedEmail) {
      setEmailStatus("idle");
      return;
    }
    if (!EMAIL_REGEX.test(debouncedEmail)) {
      setEmailStatus("invalid");
      return;
    }

    let cancelled = false;
    setEmailStatus("checking");

    fetch(`/api/auth/check-email?email=${encodeURIComponent(debouncedEmail)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.valid) {
          setEmailStatus("invalid");
          return;
        }
        setEmailStatus(data.available ? "available" : "taken");
      })
      .catch(() => {
        if (!cancelled) setEmailStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedEmail]);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const requirementResults = useMemo(
    () => passwordRequirements.map((r) => ({ ...r, passed: r.test(password) })),
    [password]
  );
  const allRequirementsMet = requirementResults.every((r) => r.passed);
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password;

  const strengthBarColor =
    strength.label === "weak"
      ? "bg-red-500"
      : strength.label === "medium"
        ? "bg-amber-400"
        : strength.label === "strong"
          ? "bg-emerald-500"
          : "bg-muted";

  const strengthTextColor =
    strength.label === "weak"
      ? "text-red-600"
      : strength.label === "medium"
        ? "text-amber-600"
        : strength.label === "strong"
          ? "text-emerald-600"
          : "text-muted-foreground";

  const canSubmit =
    name.trim().length >= 2 &&
    emailStatus === "available" &&
    allRequirementsMet &&
    passwordsMatch &&
    !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!canSubmit) {
      if (emailStatus === "taken") setFormError("Email is already registered.");
      else if (!allRequirementsMet) setFormError("Password does not meet all requirements.");
      else if (!passwordsMatch) setFormError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          role: isAdmin ? role : "STAFF",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong. Please try again.");
        if (data.field) setFieldErrors({ [data.field]: data.error });
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?registered=1");
      }, 900);
    } catch {
      setFormError("Network error. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bg-brand-pattern flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-gradient-to-b from-secondary/40 via-background to-background px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-brand transition-all"
      >
        <div className="flex justify-center">
          <LogoStacked className="h-24 w-auto" />
        </div>
        <h1 className="mt-5 text-center font-display text-2xl font-bold">
          Create an Account
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {isAdmin
            ? "Create a Staff or Admin account."
            : "New accounts are created with Staff access. An Admin can upgrade your role later."}
        </p>

        <div className="mt-6 space-y-4">
          {/* Full Name */}
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="name">
              Full Name
            </label>
            <input
              ref={nameRef}
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Email with availability check */}
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                {emailStatus === "checking" && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {emailStatus === "available" && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                {emailStatus === "taken" && <XCircle className="h-4 w-4 text-red-500" />}
              </span>
            </div>
            {emailStatus === "available" && (
              <p className="mt-1 text-xs text-emerald-600">✅ Email is available</p>
            )}
            {emailStatus === "taken" && (
              <p className="mt-1 text-xs text-red-600">❌ Email is already registered</p>
            )}
            {emailStatus === "invalid" && email.length > 0 && (
              <p className="mt-1 text-xs text-red-600">Enter a valid email address</p>
            )}
            {emailStatus === "error" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Couldn&apos;t check availability right now.
              </p>
            )}
          </div>

          {/* Password with strength meter */}
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Strength bar */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strengthBarColor}`}
                style={{ width: `${strength.percent}%` }}
              />
            </div>
            {password.length > 0 && (
              <p className={`mt-1 text-xs font-medium capitalize ${strengthTextColor}`}>
                {strength.label} password
              </p>
            )}

            {/* Requirements checklist */}
            <ul className="mt-2 space-y-1">
              {requirementResults.map((req) => (
                <li
                  key={req.id}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${
                    req.passed ? "text-emerald-600" : "text-muted-foreground"
                  }`}
                >
                  {req.passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {req.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Confirm password */}
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <p
                className={`mt-1 text-xs ${
                  passwordsMatch ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {passwordsMatch ? "✅ Passwords match" : "❌ Passwords do not match"}
              </p>
            )}
          </div>

          {/* Role selection — only shown to signed-in Admins */}
          {sessionStatus === "authenticated" && isAdmin && (
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Visible only to Admins, since you&apos;re signed in as one.
              </p>
            </div>
          )}

          {formError && (
            <p className="flex items-start gap-1.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {formError}
            </p>
          )}

          {success && (
            <p className="flex items-start gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              Account created! Redirecting to sign in…
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || success}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Creating account…" : "Create Account"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
