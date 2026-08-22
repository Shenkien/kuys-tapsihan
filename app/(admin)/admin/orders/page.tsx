import { OrderHistoryTable } from "@/components/admin/order-history-table";

export default function AdminOrderHistoryPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold">Order History</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every order ever placed — search by order number, filter by status, channel, or payment
        status. Unlike the kitchen queue, completed and cancelled orders stay here.
      </p>

      <div className="mt-6">
        <OrderHistoryTable />
      </div>
    </main>
  );
}
