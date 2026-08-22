# KUY'S Tapsihan — Smart Ordering System

**Step 4/5: Real-time kitchen queue + inventory auto-deduction** — customer
ordering, live staff dashboard, and stock tracking are wired end to end.

MLQ St. Lower Bicutan, Taguig, Philippines, 1637

## What's in this step

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma schema modeling: users/roles, menu + categories, add-ons + combo
  meals, inventory with recipes, dining tables/QR tokens, and orders
- Auth.js (NextAuth v5) credentials login for **Admin** and **Staff**,
  JWT sessions carrying `role`
- Middleware protecting `/admin/**` (Admin only) and `/staff/**`
  (Admin or Staff); `/kiosk` and `/order/[tableToken]` are the public
  customer-facing ordering flows
- Admin dashboard: categories, menu items, inventory, recipes CRUD
  (add-ons/combo CRUD screens not built yet — seeded directly for now)
- Kiosk + QR ordering flow with cart, checkout, and server-side order
  creation (`lib/orders.ts`)
- Inventory auto-deduction on order placement, with automatic reversal on
  cancellation (see "Inventory auto-deduction" below)
- Live staff kitchen queue over Pusher Channels, with Receive/Complete/
  Cancel and an ESC/POS-ready receipt preview (see "Kitchen queue" and
  "Thermal printer" below)
- Seed script with a sample admin/staff account, categories
  (Silog Meals, Beverages), tapsilog/longsilog/hotsilog menu items with
  their ingredient recipes, inventory stock, and 4 dining tables

Sales reports and a physical thermal-printer hookup come in later steps.

## 1. Install dependencies

```bash
npm install
```

> **Note:** `next-auth@5`'s published `package.json` hasn't caught up to
> list Next.js 16 as a supported peer dependency yet, even though it works
> fine with it — this is a known upstream issue, not a problem with this
> project. This repo includes a `.npmrc` with `legacy-peer-deps=true` so
> `npm install` resolves without the `ERESOLVE` error. No extra flags needed.
>
> Also: `package.json` pins Next.js to `16.0.7` (not `16.0.0`), which
> patches [CVE-2025-66478](https://vercel.com/kb/bulletin/security-bulletin-cve-2025-66478),
> a critical RCE in React Server Components affecting Next.js 16.0.0–16.0.6.
> Vercel blocks deployment of vulnerable versions outright, so this pin is
> required, not optional. If you ever bump the Next.js version yourself,
> check you're not landing back in the 16.0.0–16.0.6 range.

## 2. Set up a Neon Postgres database

1. Create a project at [neon.tech](https://neon.tech) (free tier is fine).
2. From the Neon dashboard, copy **two** connection strings:
   - The **pooled** connection string → `DATABASE_URL`
   - The **direct** connection string → `DIRECT_URL`
   (Neon's connection details panel has a toggle for "Pooled connection".)

## 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` and `DIRECT_URL` from Neon, then generate an
auth secret:

```bash
npx auth secret
```

This writes `AUTH_SECRET` into `.env` automatically. Set `NEXTAUTH_URL`
to `http://localhost:3000` for local dev.

## 4. Create the database schema

```bash
npx prisma migrate dev --name init
```

This creates all tables in Neon and generates the Prisma Client.

## 5. Seed sample data

```bash
npx prisma db seed
```

This creates:
- Admin login: `owner@kuystapsihan.ph` / `ChangeMe123!`
- Staff login: `kitchen@kuystapsihan.ph` / `ChangeMe123!`

**Change these passwords before going live.**

## 6. Run the dev server

```bash
npm run dev
```

Visit:
- `http://localhost:3000` — landing page with links to all four entry points
- `http://localhost:3000/login` — Admin/Staff login
- `http://localhost:3000/admin` — Admin dashboard (role-gated)
- `http://localhost:3000/staff` — Kitchen queue (role-gated)
- `http://localhost:3000/kiosk` — self-service kiosk (public, placeholder)
- `http://localhost:3000/order/T1` — QR order-to-go for table T1 (public, placeholder)

## Deploying to Vercel

1. Push this project to a GitHub/GitLab/Bitbucket repo.
2. In Vercel, **Add New Project** → import the repo.
3. Under **Environment Variables**, add: `DATABASE_URL`, `DIRECT_URL`,
   `AUTH_SECRET`, `NEXTAUTH_URL` (set this to your production URL, e.g.
   `https://kuystapsihan.vercel.app`), and the six `PUSHER_*`/
   `NEXT_PUBLIC_PUSHER_*` vars from `.env.example`.
4. Deploy. The `postinstall` script runs `prisma generate` automatically,
   and `build` runs `prisma generate && next build`.
5. Run migrations against production once, from your local machine (with
   `.env` pointed at the same Neon database Vercel uses):
   ```bash
   npx prisma migrate deploy
   npx prisma db seed   # optional, only if you want the sample data live
   ```

Neon + Vercel work well together because Neon's pooled connection string
is designed for serverless functions — that's why the schema uses both
`DATABASE_URL` (pooled, runtime) and `DIRECT_URL` (direct, migrations only).

## Project structure

```
app/
  (admin)/admin/         Admin dashboard (role-gated)
  (staff)/staff/         Kitchen order queue (role-gated)
  (kiosk)/kiosk/         Self-service kiosk (public)
  (order)/order/[tableToken]/   QR order-to-go (public)
  login/                 Admin/Staff login
  api/auth/[...nextauth]/ Auth.js route handler
  layout.tsx, page.tsx, globals.css, providers.tsx
auth.ts                  Auth.js config (credentials provider, JWT callbacks)
proxy.ts                  Role-based route protection (renamed from middleware.ts in Next.js 16)
lib/
  prisma.ts               Prisma client singleton
  utils.ts                 cn() + formatCurrency() helpers
prisma/
  schema.prisma            Full data model
  seed.ts                   Sample data
types/next-auth.d.ts        Session/JWT type augmentation for role
```

## Kitchen queue + real-time (Step 4)

`/staff` shows two live columns — **New Orders** and **Preparing** — fed by
[Pusher Channels](https://pusher.com/channels/) rather than a self-hosted
Socket.io server, because Vercel's serverless functions can't host a
persistent WebSocket server. Your API routes just call
`pusher.trigger(...)` (see `lib/pusher-server.ts`); Pusher's hosted
infrastructure pushes the event to every open staff dashboard. You'll need
a free Pusher app (see `.env.example` for the vars) — sign up at
[pusher.com](https://pusher.com), create a Channels app, and copy its keys.

Flow: customer places an order → `order:new` event → appears in **New
Orders** instantly → staff clicks **Receive** → order moves to
**Preparing**, `PATCH /api/orders/[id]` stamps it CONFIRMED, and a receipt
preview modal shows exactly what would print → staff clicks **Complete**
→ order drops off the board. **Cancel** is also available on any active
order and reverses its inventory deductions (see below).

## Inventory auto-deduction (Step 5)

Already wired into order creation (`lib/orders.ts#createOrder`) — placing
an order deducts every ingredient a menu item's recipe calls for (including
every item bundled inside a combo meal) in the same DB transaction as the
order itself, failing the whole order if stock would go negative. Each
deduction is logged as an `InventoryTransaction` (`type: DEDUCTION`).
Cancelling an order from the kitchen queue reverses this automatically —
`lib/orders.ts#updateOrderStatus` writes offsetting `RETURN` transactions
and restores `quantityOnHand`.

## Thermal printer (ESC/POS) — receipt built, hardware pending

`lib/receipt.ts` builds a full ESC/POS byte sequence (`buildReceiptEscPos`)
for the kitchen slip — queue number, items, quantities, add-ons, total,
channel — using raw ESC/POS commands (no printer-vendor SDK dependency).
Right now, clicking **Receive** shows that same receipt as an on-screen
preview modal instead of sending it to hardware, since there's no printer
connected yet.

When a physical thermal printer is available: write a small always-on
"print bridge" script (Node, on a PC/Raspberry Pi on the same network as
the printer) that subscribes to the `kitchen-queue` Pusher channel's
`order:updated` event, and on a `CONFIRMED` status, calls
`GET /api/orders/[id]` (or captures the PATCH response) to get the
`receipt.escPosBase64` payload, base64-decodes it, and writes the raw
bytes to the printer over USB or network (e.g. with `node-thermal-printer`
or a raw TCP/USB socket). No changes to this Next.js app are needed — the
receipt bytes are already being generated and returned.

## Next steps

- **Step 6**: Sales reporting dashboards
- **Step 7**: Print bridge script + physical thermal printer hookup (ESC/POS
  generation is done — see above)
