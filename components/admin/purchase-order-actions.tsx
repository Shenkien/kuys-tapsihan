"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Send, PackageCheck, XCircle } from "lucide-react";

export function PurchaseOrderActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "mark-ordered" | "receive" | "cancel", confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/purchase-orders/${id}/${action}`, { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Could not update this purchase order.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" && (
          <button
            onClick={() => run("mark-ordered")}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {busy === "mark-ordered" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Mark as Ordered
          </button>
        )}
        {(status === "DRAFT" || status === "ORDERED") && (
          <button
            onClick={() =>
              run("receive", "Confirm delivery? This restocks every line item and can't be undone.")
            }
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {busy === "receive" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
            Receive Delivery
          </button>
        )}
        {(status === "DRAFT" || status === "ORDERED") && (
          <button
            onClick={() => run("cancel", "Cancel this purchase order?")}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
          >
            {busy === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Cancel PO
          </button>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}
