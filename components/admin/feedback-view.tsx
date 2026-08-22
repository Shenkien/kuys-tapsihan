"use client";

import { useEffect, useState } from "react";
import { Star, MessageSquare } from "lucide-react";

interface FeedbackEntry {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  order: { orderNumber: string; channel: "KIOSK" | "QR" };
}

interface FeedbackData {
  entries: FeedbackEntry[];
  total: number;
  averageRating: number | null;
  distribution: { star: number; count: number }[];
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-4 w-4 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

export function FeedbackView() {
  const [data, setData] = useState<FeedbackData | null>(null);

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return null;

  const maxCount = Math.max(1, ...data.distribution.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Average Rating</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-display text-3xl font-bold">{data.averageRating ?? "—"}</p>
            {data.averageRating && <Stars rating={Math.round(data.averageRating)} />}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{data.total} response(s)</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Distribution</p>
          <div className="mt-2 space-y-1">
            {data.distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-muted-foreground">{d.star}</span>
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <div className="h-2 flex-1 overflow-hidden rounded bg-secondary">
                  <div className="h-full rounded bg-amber-400" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                </div>
                <span className="w-6 text-right text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-display font-semibold">Recent Feedback</h3>
        {data.entries.length === 0 ? (
          <p className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto mb-2 h-6 w-6" />
            No feedback submitted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {data.entries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <Stars rating={entry.rating} />
                  <span className="text-xs text-muted-foreground">
                    #{entry.order.orderNumber} · {entry.order.channel} ·{" "}
                    {new Date(entry.createdAt).toLocaleDateString("en-PH", { dateStyle: "medium" })}
                  </span>
                </div>
                {entry.comment && <p className="mt-2 text-sm text-muted-foreground">{entry.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
