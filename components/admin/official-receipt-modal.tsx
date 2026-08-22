"use client";

import { Printer, X } from "lucide-react";
import { formatOfficialReceiptText, type OfficialReceiptData } from "@/lib/receipt";

export function OfficialReceiptModal({ receipt, onClose }: { receipt: OfficialReceiptData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Printer className="h-4 w-4 text-primary" />
            Official Receipt {receipt.receiptNumber}
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="bg-white p-4">
          <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-snug text-black">
            {formatOfficialReceiptText(receipt)}
          </pre>
        </div>

        <div className="border-t border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
          Preview only — no thermal printer is connected yet. Once one's wired up via the print bridge,
          this exact receipt prints automatically for the customer instead of showing here.
        </div>
      </div>
    </div>
  );
}
