"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Wallet } from "lucide-react";
import { OfficialReceiptModal } from "@/components/admin/official-receipt-modal";
import type { OfficialReceiptData } from "@/lib/receipt";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "CARD", label: "Card" },
] as const;

const DISCOUNT_TYPES = [
  { value: "NONE", label: "No discount" },
  { value: "SENIOR_CITIZEN", label: "Senior Citizen (RA 9994) — 20% + VAT-exempt" },
  { value: "PWD", label: "PWD (RA 10754) — 20% + VAT-exempt" },
  { value: "PROMO", label: "Promo / manual discount" },
] as const;

export function MarkPaidForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]["value"]>("CASH");
  const [discountType, setDiscountType] = useState<(typeof DISCOUNT_TYPES)[number]["value"]>("NONE");
  const [discountReason, setDiscountReason] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<OfficialReceiptData | null>(null);

  const needsReason = discountType !== "NONE";
  const needsAmount = discountType === "PROMO";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch(`/api/orders/${orderId}/payment`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethod,
        discountType,
        discountReason: needsReason ? discountReason.trim() : undefined,
        discountAmount: needsAmount ? Number(discountAmount) : undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Could not confirm payment.");
      return;
    }

    setReceipt(data.receipt.data as OfficialReceiptData);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 font-display font-semibold">
          <Wallet className="h-4 w-4 text-primary" />
          Confirm Payment
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Payment method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Discount</label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as typeof discountType)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {DISCOUNT_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {needsAmount && (
          <div>
            <label className="mb-1 block text-sm font-medium">Discount amount (₱)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {needsReason && (
          <div>
            <label className="mb-1 block text-sm font-medium">
              {discountType === "PROMO" ? "Promo code / reason" : "Senior Citizen / PWD ID number"}
            </label>
            <input
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder={discountType === "PROMO" ? "e.g. GRANDOPENING10" : "e.g. SC-2024-00931"}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Confirm Payment
        </button>
      </form>

      {receipt && <OfficialReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}
