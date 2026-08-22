export type Lang = "en" | "fil";

/**
 * Flat key -> {en, fil} dictionary for the customer-facing ordering flow
 * (Kiosk + QR). Deliberately flat rather than nested — easier to scan for
 * missing translations and to extend one string at a time.
 */
const dict = {
  tagline_kiosk: { en: "Self-Service Kiosk", fil: "Kiosk na Sarili ang Pag-order" },
  tagline_qr_table: { en: "Table {table} — Order to Go", fil: "Table {table} — Bibilhing Pauwi" },
  tagline_qr_generic: { en: "Order to Go", fil: "Bibilhing Pauwi" },
  cart: { en: "Cart", fil: "Kariton" },
  combos: { en: "Combos", fil: "Combo" },
  no_items_category: { en: "No items in this category right now.", fil: "Wala pang item sa kategoryang ito ngayon." },
  no_combos: { en: "No combo meals available right now.", fil: "Wala pang combo meal ngayon." },
  add: { en: "Add", fil: "Idagdag" },
  add_extras: { en: "+ Add extras (Extra Rice, Egg, Drinks…)", fil: "+ Magdagdag ng extra (Extra Rice, Itlog, Inumin…)" },
  best_seller: { en: "Best Seller", fil: "Paborito" },
  new_badge: { en: "New", fil: "Bago" },
  your_cart: { en: "Your Cart", fil: "Iyong Kariton" },
  cart_empty: { en: "Your cart is empty.", fil: "Walang laman ang iyong kariton." },
  total: { en: "Total", fil: "Kabuuan" },
  proceed_checkout: { en: "Proceed to Checkout", fil: "Magpatuloy sa Bayad" },
  back_to_menu: { en: "Back to Menu", fil: "Bumalik sa Menu" },
  checkout_title: { en: "Checkout", fil: "Bayad" },
  order_summary: { en: "Order Summary", fil: "Buod ng Order" },
  name_pickup_kiosk: { en: "Name for order pickup call (optional)", fil: "Pangalan para sa tawag ng order (opsyonal)" },
  name_optional: { en: "Name (optional)", fil: "Pangalan (opsyonal)" },
  payment_method: { en: "Payment method", fil: "Paraan ng Bayad" },
  pay_cash_note: { en: "Pay with cash at the counter.", fil: "Magbayad ng cash sa counter." },
  pay_other_note: {
    en: "Payment is settled at the counter — this just lets staff know what to expect.",
    fil: "Babayaran sa counter — para lang malaman ng staff kung ano ang aasahan.",
  },
  order_notes: { en: "Order notes (optional)", fil: "Tala para sa order (opsyonal)" },
  order_notes_placeholder: { en: "Anything else the kitchen should know?", fil: "May iba pa bang dapat malaman ang kusina?" },
  place_order: { en: "Place Order", fil: "I-order Na" },
  order_placed: { en: "Order Placed!", fil: "Naisumite ang Order!" },
  show_number: { en: "Show this number when you pick up your order.", fil: "Ipakita ang numerong ito kapag kukunin ang order." },
  order_number: { en: "Order Number", fil: "Numero ng Order" },
  est_wait: { en: "Estimated wait: ~{min} minutes", fil: "Tinatayang paghihintay: ~{min} minuto" },
  track_link: { en: "Open a trackable link for this order", fil: "Buksan ang link para masubaybayan ang order" },
  bookmark_note: {
    en: "Bookmark it to check your order status later, even after closing this tab.",
    fil: "I-bookmark ito para masubaybayan ang status kahit isara ang tab na ito.",
  },
  start_new_order: { en: "Start a New Order", fil: "Magsimula ng Bagong Order" },
  quantity: { en: "Quantity", fil: "Dami" },
  addons_label: { en: "Add-ons", fil: "Extra" },
  add_to_cart: { en: "Add to Cart", fil: "Idagdag sa Kariton" },

  status_pending_label: { en: "Order received", fil: "Natanggap ang Order" },
  status_pending_desc: { en: "We've got your order — the kitchen will confirm it shortly.", fil: "Natanggap na ang order — kukumpirmahin ito ng kusina." },
  status_confirmed_label: { en: "Confirmed", fil: "Kinumpirma" },
  status_confirmed_desc: { en: "The kitchen has confirmed your order.", fil: "Kinumpirma na ng kusina ang iyong order." },
  status_preparing_label: { en: "Being prepared", fil: "Niluluto" },
  status_preparing_desc: { en: "Your food is being cooked right now.", fil: "Niluluto na ang iyong pagkain." },
  status_ready_label: { en: "Ready!", fil: "Handa Na!" },
  status_ready_desc: { en: "Your order is ready for pickup.", fil: "Handa na ang iyong order para kunin." },
  status_completed_label: { en: "Completed", fil: "Tapos Na" },
  status_completed_desc: { en: "Enjoy your meal!", fil: "Kainin nang masarap!" },
  status_cancelled_label: { en: "Cancelled", fil: "Kinansela" },
  status_cancelled_desc: { en: "This order was cancelled. Please ask staff for help.", fil: "Nakansela ang order na ito. Pakilapitan ang staff." },
} as const;

export type TranslationKey = keyof typeof dict;

export function translate(key: TranslationKey, lang: Lang, vars?: Record<string, string | number>): string {
  let text: string = dict[key][lang];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
