"use client";

import { useEffect, useState } from "react";
import { Star, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function FeedbackForm({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${orderId}/feedback`)
      .then((r) => r.json())
      .then((data) => {
        setAlreadySubmitted(Boolean(data.feedback));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orderId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Tap a star to rate your order.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/orders/${orderId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Could not submit your feedback.");
      return;
    }
    setSuccess(true);
  }

  if (loading) return null;

  if (alreadySubmitted || success) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Thanks for your feedback!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-border bg-card p-5">
      <p className="text-center font-display font-semibold">How was your order?</p>

      <div className="mt-3 flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1"
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              className={`h-8 w-8 transition-colors ${
                star <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us more (optional)…"
        rows={2}
        className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      {error && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit Feedback
      </button>
    </form>
  );
}
