// Channel and event names shared between the server (lib/pusher-server.ts,
// which trigger()s these) and client components (which subscribe()/bind()
// to them). Kept in its own file, with no dependency on the `pusher`
// server SDK or its secret key, so client components can safely import it.

export const KITCHEN_CHANNEL = "kitchen-queue";

export const KITCHEN_EVENTS = {
  ORDER_NEW: "order:new",
  ORDER_UPDATED: "order:updated",
} as const;

export const ORDER_STATUS_EVENT = "order:status";

export function orderChannelName(orderId: string) {
  return `order-${orderId}`;
}
