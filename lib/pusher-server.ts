import PusherServer from "pusher";

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

// One channel for the whole kitchen queue — a single small stall doesn't
// need per-table or per-order channels, and it keeps the client-side
// subscription trivial (one channel, two event types).
export const KITCHEN_CHANNEL = "kitchen-queue";

export const KITCHEN_EVENTS = {
  ORDER_NEW: "order:new",
  ORDER_UPDATED: "order:updated",
} as const;

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
