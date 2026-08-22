import { OrderTracker } from "@/components/ordering/order-tracker";
import { LogoLockup } from "@/components/logo";

// Public by design — same trust model as a shipment tracking link: the
// order id is an unguessable cuid, and getOrderStatus (used by the API
// route this page calls) only ever exposes minimal, non-sensitive fields.
export default async function TrackOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-4">
        <LogoLockup variant="dark" />
      </div>
      <OrderTracker orderId={id} />
    </main>
  );
}
