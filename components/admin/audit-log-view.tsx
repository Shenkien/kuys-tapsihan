"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, History } from "lucide-react";

interface AuditEntry {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  createdAt: string;
}

const ENTITY_TYPES = ["User", "Order", "MenuItem", "BusinessSettings", "PurchaseOrder", "ShiftClose"];

const ACTION_LABEL: Record<string, string> = {
  USER_UPDATED: "User updated",
  USER_PASSWORD_RESET: "Password reset",
  ORDER_REFUNDED: "Order refunded",
  SETTINGS_UPDATED: "Settings updated",
  MENU_PRICE_CHANGED: "Price changed",
  PURCHASE_ORDER_RECEIVED: "PO received",
  SHIFT_CLOSED: "Shift closed",
};

export function AuditLogView() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entityType, setEntityType] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (entityType) params.set("entityType", entityType);
    params.set("page", String(page));

    fetch(`/api/audit-log?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      });
  }, [entityType, page]);

  useEffect(load, [load]);
  useEffect(() => setPage(1), [entityType]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">{total} entries</span>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">By</th>
              <th className="px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {entries === null && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            )}
            {entries?.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-muted-foreground">
                  <History className="mx-auto mb-2 h-6 w-6" />
                  No audit entries yet.
                </td>
              </tr>
            )}
            {entries?.map((entry) => (
              <tr key={entry.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                    {ACTION_LABEL[entry.action] ?? entry.action}
                  </span>
                </td>
                <td className="px-4 py-3">{entry.description}</td>
                <td className="px-4 py-3 text-muted-foreground">{entry.actorName}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-secondary disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-border px-3 py-1.5 text-sm transition hover:bg-secondary disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
