import { formatCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shapes this module consumes — deliberately narrow/plain so it can be fed
// either a fresh-from-Prisma order or a serialized one from an API response.
// ---------------------------------------------------------------------------

export interface ReceiptAddOnLine {
  name: string;
  price: number;
  quantity: number;
}

export interface ReceiptItemLine {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string | null;
  addOns: ReceiptAddOnLine[];
}

export interface ReceiptData {
  orderNumber: string;
  channel: "KIOSK" | "QR";
  tableNumber?: string | null;
  customerName?: string | null;
  createdAt: string | Date;
  items: ReceiptItemLine[];
  subtotal: number;
  totalAmount: number;
  notes?: string | null;
}

const PAPER_WIDTH = 32; // chars, standard for 58mm thermal paper at font A

function padRow(left: string, right: string, width = PAPER_WIDTH): string {
  const space = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(space) + right;
}

function centered(text: string, width = PAPER_WIDTH): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(pad) + text;
}

/** Plain-text rendering — used both for the on-screen preview modal (in a
 * <pre>) and as the human-readable body wrapped in ESC/POS control codes
 * below. Keeping one source of truth means the preview always matches
 * exactly what would come out of the printer. */
export function formatReceiptText(receipt: ReceiptData): string {
  const lines: string[] = [];
  const divider = "-".repeat(PAPER_WIDTH);

  lines.push(centered("KUY'S TAPSIHAN"));
  lines.push(centered("MLQ St. Lower Bicutan"));
  lines.push(centered("Taguig, 1637"));
  lines.push(divider);
  lines.push(centered(`QUEUE #${receipt.orderNumber}`));
  lines.push(divider);
  lines.push(padRow("Channel:", receipt.channel === "KIOSK" ? "Kiosk (Dine-in)" : "QR Order"));
  if (receipt.tableNumber) lines.push(padRow("Table:", receipt.tableNumber));
  if (receipt.customerName) lines.push(padRow("Name:", receipt.customerName));
  lines.push(
    padRow(
      "Time:",
      new Date(receipt.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
    )
  );
  lines.push(divider);

  for (const item of receipt.items) {
    lines.push(`${item.quantity}x ${item.name}`);
    lines.push(padRow("", formatCurrency(item.subtotal)));
    for (const addOn of item.addOns) {
      lines.push(`   + ${addOn.quantity > 1 ? `${addOn.quantity}x ` : ""}${addOn.name}`);
    }
    if (item.notes) lines.push(`   note: ${item.notes}`);
  }

  lines.push(divider);
  lines.push(padRow("Subtotal:", formatCurrency(receipt.subtotal)));
  lines.push(padRow("TOTAL:", formatCurrency(receipt.totalAmount)));
  lines.push(divider);
  if (receipt.notes) {
    lines.push(`Order note: ${receipt.notes}`);
    lines.push(divider);
  }
  lines.push(centered("*** KITCHEN COPY ***"));

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// ESC/POS command bytes
// ---------------------------------------------------------------------------
// This is built without any printer-vendor SDK/dependency, so it's ready to
// hand to a print bridge the day a physical printer shows up — the bridge's
// entire job becomes "open the device, write these bytes, cut". Commands
// used are the common subset nearly every ESC/POS 58mm/80mm thermal printer
// supports (Epson TM-T family and the many clones that copy its command set).

const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: [ESC, 0x40], // ESC @  — reset printer state
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x01],
  DOUBLE_HEIGHT_OFF: [GS, 0x21, 0x00],
  CUT: [GS, 0x56, 0x42, 0x00], // partial cut with feed
  LF: [0x0a],
};

class EscPosBuilder {
  private bytes: number[] = [];

  raw(cmd: number[]) {
    this.bytes.push(...cmd);
    return this;
  }

  text(str: string) {
    // Thermal printers speak single-byte encodings (CP437 etc), not UTF-8.
    // Peso sign and other non-ASCII glyphs get folded to a printer-safe
    // fallback here rather than risking mojibake on real hardware.
    const ascii = str.replace(/₱/g, "P").replace(/[^\x00-\x7F]/g, "?");
    for (let i = 0; i < ascii.length; i++) this.bytes.push(ascii.charCodeAt(i));
    return this;
  }

  line(str = "") {
    return this.text(str).raw(CMD.LF);
  }

  build(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

/** Builds the raw ESC/POS byte sequence for a kitchen receipt. Returns a
 * base64 string so it can travel through a normal JSON API response — a
 * print bridge on the LAN would decode this and write it straight to the
 * printer's USB/network socket. */
export function buildReceiptEscPos(receipt: ReceiptData): string {
  const b = new EscPosBuilder();
  b.raw(CMD.INIT);

  b.raw(CMD.ALIGN_CENTER);
  b.raw(CMD.BOLD_ON).line("KUY'S TAPSIHAN").raw(CMD.BOLD_OFF);
  b.line("MLQ St. Lower Bicutan").line("Taguig, 1637").line();

  b.raw(CMD.DOUBLE_HEIGHT_ON).raw(CMD.BOLD_ON);
  b.line(`QUEUE #${receipt.orderNumber}`);
  b.raw(CMD.DOUBLE_HEIGHT_OFF).raw(CMD.BOLD_OFF);
  b.line("-".repeat(PAPER_WIDTH));

  b.raw(CMD.ALIGN_LEFT);
  b.line(padRow("Channel:", receipt.channel === "KIOSK" ? "Kiosk (Dine-in)" : "QR Order"));
  if (receipt.tableNumber) b.line(padRow("Table:", receipt.tableNumber));
  if (receipt.customerName) b.line(padRow("Name:", receipt.customerName));
  b.line(
    padRow(
      "Time:",
      new Date(receipt.createdAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
    )
  );
  b.line("-".repeat(PAPER_WIDTH));

  for (const item of receipt.items) {
    b.raw(CMD.BOLD_ON).line(`${item.quantity}x ${item.name}`).raw(CMD.BOLD_OFF);
    b.line(padRow("", formatCurrency(item.subtotal)));
    for (const addOn of item.addOns) {
      b.line(`   + ${addOn.quantity > 1 ? `${addOn.quantity}x ` : ""}${addOn.name}`);
    }
    if (item.notes) b.line(`   note: ${item.notes}`);
  }

  b.line("-".repeat(PAPER_WIDTH));
  b.line(padRow("Subtotal:", formatCurrency(receipt.subtotal)));
  b.raw(CMD.DOUBLE_HEIGHT_ON).raw(CMD.BOLD_ON);
  b.line(padRow("TOTAL:", formatCurrency(receipt.totalAmount)));
  b.raw(CMD.DOUBLE_HEIGHT_OFF).raw(CMD.BOLD_OFF);
  b.line("-".repeat(PAPER_WIDTH));

  if (receipt.notes) {
    b.line(`Order note: ${receipt.notes}`);
    b.line("-".repeat(PAPER_WIDTH));
  }

  b.raw(CMD.ALIGN_CENTER).line("*** KITCHEN COPY ***").line().line();
  b.raw(CMD.CUT);

  const bytes = b.build();
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
