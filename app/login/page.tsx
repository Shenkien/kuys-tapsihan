"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { LogoStacked } from "@/components/logo";

// /admin is Admin-only and /staff needs at least Staff — both enforced again
// server-side in proxy.ts. Picking the wrong default for a role causes a
// redirect loop (Staff -> /admin -> bounced back to /login -> ...), so this
// mirrors that same access rule on the client to avoid ever sending someone
// somewhere they'll immediately get redirected away from.
function resolveDestination(
  role: "ADMIN" | "STAFF" | undefined,
  requestedCallbackUrl: string | null
): string {
  const fallback = role === "ADMIN" ? "/admin" : "/staff";

  if (!requestedCallbackUrl) return fallback;
  if (requestedCallbackUrl.startsWith("/admin") && role !== "ADMIN") return fallback;
  if (requestedCallbackUrl.startsWith("/staff") && role !== "ADMIN" && role !== "STAFF") {
    return fallback;
  }
  return requestedCallbackUrl;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCallbackUrl = searchParams.get("callbackUrl");
  const justRegistered = searchParams.get("registered") === "1";

  const emailRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    justRegistered ? "Account created! Please sign in." : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-focus the email field on page load.
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      // Ask the diagnostic endpoint for a specific, friendly reason.
      try {
        const res = await fetch("/api/auth/login-reason", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        setError(data.message ?? "Invalid email or password.");
      } catch {
        setError("Invalid email or password.");
      }
      setIsSubmitting(false);
      return;
    }

    // Check whether this account is already active on another device.
    const session = await getSession();
    if (session?.user?.otherDeviceActive) {
      setNotice("Heads up: this account is also signed in on another device.");
    }

    const role = session?.user?.role;
    const destination = resolveDestination(role, requestedCallbackUrl);

    setIsSubmitting(false);
    router.push(destination);
    router.refresh();
  }

  return (
    <main className="bg-brand-pattern flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-gradient-to-b from-secondary/40 via-background to-background px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-brand transition-all"
      >
        <div className="flex justify-center">
          <LogoStacked className="h-28 w-auto" />
        </div>
        <h1 className="mt-5 text-center font-display text-2xl font-bold">
          Staff / Admin Login
        </h1>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Pressing Enter in either field submits the form natively since
              both inputs live inside <form onSubmit={...}> with a submit button. */}

          {error && (
            <p className="flex items-start gap-1.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {notice && (
            <p className="flex items-start gap-1.5 text-sm text-primary">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
