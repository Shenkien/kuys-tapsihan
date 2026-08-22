import { getTables } from "@/lib/tables";
import { serializePrisma } from "@/lib/serialize";
import { TableManager } from "@/components/admin/table-manager";

export default async function AdminTablesPage() {
  const tables = await getTables();

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Tables &amp; QR Codes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create dining tables, print their QR codes for the QR ordering channel, deactivate a table
        that's out of service, or reissue a QR code if a printed sticker gets lost or damaged.
      </p>

      <div className="mt-6">
        <TableManager initialTables={serializePrisma(tables)} />
      </div>
    </main>
  );
}
