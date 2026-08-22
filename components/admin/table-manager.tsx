"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Plus, Loader2, AlertCircle, RefreshCw, Printer, Power, Trash2 } from "lucide-react";

interface TableRow {
  id: string;
  tableNumber: string;
  qrCodeToken: string;
  isActive: boolean;
  _count: { orders: number };
}

export function TableManager({ initialTables }: { initialTables: TableRow[] }) {
  const [tables, setTables] = useState(initialTables);
  const [newNumber, setNewNumber] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrPreview, setQrPreview] = useState<{ table: TableRow; dataUrl: string } | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  function refresh() {
    fetch("/api/tables")
      .then((r) => r.json())
      .then(setTables)
      .catch(() => setError("Could not refresh tables."));
  }

  function orderUrl(token: string) {
    return `${origin || window.location.origin}/order/${token}`;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newNumber.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableNumber: newNumber.trim() }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create table.");
      return;
    }
    setNewNumber("");
    refresh();
  }

  async function handleToggleActive(table: TableRow) {
    const res = await fetch(`/api/tables/${table.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !table.isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not update table.");
      return;
    }
    refresh();
  }

  async function handleRegenerateQr(table: TableRow) {
    if (!confirm(`Reissue the QR code for ${table.tableNumber}? The old printed sticker will stop working.`)) return;
    const res = await fetch(`/api/tables/${table.id}/regenerate-qr`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not reissue QR code.");
      return;
    }
    refresh();
    setQrPreview(null);
  }

  async function handleDelete(table: TableRow) {
    if (!confirm(`Delete table "${table.tableNumber}"?`)) return;
    const res = await fetch(`/api/tables/${table.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not delete table.");
      return;
    }
    refresh();
  }

  async function handleShowQr(table: TableRow) {
    const dataUrl = await QRCode.toDataURL(orderUrl(table.qrCodeToken), { width: 400, margin: 2 });
    setQrPreview({ table, dataUrl });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex max-w-md gap-2">
        <input
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
          placeholder="Table number/label, e.g. T5…"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={creating || !newNumber.trim()}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Table
        </button>
      </form>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Table</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Orders placed</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => (
              <tr key={table.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium">{table.tableNumber}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      table.isActive ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {table.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{table._count.orders}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleShowQr(table)}
                      className="rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      View QR
                    </button>
                    <button
                      onClick={() => handleToggleActive(table)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Toggle active"
                      title={table.isActive ? "Deactivate" : "Activate"}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRegenerateQr(table)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Reissue QR"
                      title="Reissue QR code"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(table)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete"
                      title="Delete table"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tables.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No tables yet — add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {qrPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setQrPreview(null)}>
          <div
            className="w-full max-w-xs rounded-xl bg-card p-6 text-center shadow-xl print:shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-lg font-bold">{qrPreview.table.tableNumber}</p>
            <p className="mt-1 text-xs text-muted-foreground">Scan to order at this table</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrPreview.dataUrl} alt={`QR code for ${qrPreview.table.tableNumber}`} className="mx-auto mt-4 h-56 w-56" />
            <p className="mt-3 break-all text-[10px] text-muted-foreground">{orderUrl(qrPreview.table.qrCodeToken)}</p>

            <div className="mt-5 flex justify-center gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={() => setQrPreview(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
