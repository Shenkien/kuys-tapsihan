import { AuditLogView } from "@/components/admin/audit-log-view";

export default function AdminAuditLogPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Audit Log</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Who changed what, when — user management, refunds, settings, price changes, purchase order
        receiving, and shift closes.
      </p>

      <div className="mt-6">
        <AuditLogView />
      </div>
    </main>
  );
}
