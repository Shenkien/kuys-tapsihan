import PusherServer from "pusher";
import { KITCHEN_CHANNEL, KITCHEN_EVENTS, ORDER_STATUS_EVENT, orderChannelName } from "@/lib/pusher-events";

// Single shared server-side Pusher client. Anything that changes the
// kitchen queue (a new order placed, staff updating a status) calls
// `pusherServer.trigger(...)` — Pusher's hosted service fans that out over
// WebSockets to every subscribed browser. No persistent socket server of
// our own to run or deploy, which is what makes this work on Vercel.
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

// Channel/event names live in lib/pusher-events.ts (no server secret in
// that file) so client components can import them directly — re-exported
// here too so existing server-side imports of KITCHEN_CHANNEL/KITCHEN_EVENTS
// from this module keep working unchanged.
export { KITCHEN_CHANNEL, KITCHEN_EVENTS, ORDER_STATUS_EVENT, orderChannelName };

/** Fire-and-forget: a failed Pusher call should never fail the order
 * itself. The order is already committed in Postgres by the time this
 * runs — worst case, the staff dashboard picks it up on its next poll
 * refresh instead of instantly. */
export async function publishKitchenEvent(
  event: (typeof KITCHEN_EVENTS)[keyof typeof KITCHEN_EVENTS],
  payload: unknown
) {
  try {
    await pusherServer.trigger(KITCHEN_CHANNEL, event, payload);
  } catch (err) {
    console.error(`Pusher publish failed (${event}):`, err);
  }
}

// ---------------------------------------------------------------------------
// Order Status Tracking Module (customer-facing) — Customer Notification Function
// ---------------------------------------------------------------------------
// One channel per order, separate from the shared kitchen-queue channel:
// a customer's tracking tab only needs updates about *their* order, and
// giving each order its own channel means the tracking page doesn't have
// to filter out every other table's traffic.

export async function publishOrderStatusEvent(orderId: string, payload: unknown) {
  try {
    await pusherServer.trigger(orderChannelName(orderId), ORDER_STATUS_EVENT, payload);
  } catch (err) {
    console.error(`Pusher publish failed (${ORDER_STATUS_EVENT}):`, err);
  }
}
