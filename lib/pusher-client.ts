"use client";

import PusherClient from "pusher-js";

let client: PusherClient | null = null;

/** Lazily creates one Pusher client per browser tab and reuses it — avoids
 * opening a fresh WebSocket connection on every component re-render. */
export function getPusherClient(): PusherClient {
  if (!client) {
    client = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return client;
}
