"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, ArrowLeft, Copy, Check } from "lucide-react";
import { LogoStacked } from "@/components/logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; resetUrl?: string; userName?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setResult(data);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center">
          <LogoStacked className="h-28 w-auto" />
        </div>
        <h1 className="mt-5 text-center font-display text-2xl font-bold">Reset your password</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Enter your account email and we'll generate a reset link.
        </p>

        {!result ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="flex items-start gap-1.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Reset Link
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">{result.message}</p>

            {result.resetUrl && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">
                  No email service is connected yet, so here's your link directly — valid for 30
                  minutes:
                </p>
                <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
                  <code className="flex-1 truncate text-xs">{result.resetUrl}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.resetUrl!);
                      setCopied(true);
                    }}
                    className="shrink-0 rounded p-1 hover:bg-secondary"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Link href={result.resetUrl} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                  Open reset link →
                </Link>
              </div>
            )}
          </div>
        )}

        <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to login
        </Link>
      </div>
    </main>
  );
}
