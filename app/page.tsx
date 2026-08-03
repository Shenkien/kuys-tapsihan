import Link from "next/link";
import {
  UtensilsCrossed,
  QrCode,
  ClipboardList,
  ShieldCheck,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { Logo } from "@/components/logo";

const entryPoints = [
  {
    href: "/kiosk",
    title: "Self-Service Kiosk",
    desc: "Order at the counter, dine in.",
    icon: UtensilsCrossed,
    active: true,
  },
  {
    href: "#",
    title: "QR Order-to-Go",
    desc: "Scan the QR code at your table to order.",
    icon: QrCode,
    active: false,
  },
  {
    href: "/login",
    title: "Staff Login",
    desc: "Kitchen order queue and status updates.",
    icon: ClipboardList,
    active: true,
  },
  {
    href: "/login",
    title: "Admin Login",
    desc: "Menu, inventory, and sales reports.",
    icon: ShieldCheck,
    active: true,
  },
];

export default function HomePage() {
  return (
    <main className="bg-brand-pattern min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-secondary/40 via-background to-background px-6 py-16">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 text-center">
        <Logo className="h-56 w-auto drop-shadow-sm sm:h-64" />

        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Smart Ordering System
          </h1>
          <p className="mt-3 text-muted-foreground">
            MLQ St. Lower Bicutan, Taguig, Philippines
          </p>
        </div>

        <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          {entryPoints.map(({ href, title, desc, icon: Icon, active }) =>
            active ? (
              <Link
                key={title}
                href={href}
                className="group flex items-start gap-4 rounded-xl border border-border bg-card p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-brand"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <h2 className="font-display text-lg font-semibold">{title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </span>
              </Link>
            ) : (
              <div
                key={title}
                className="flex items-start gap-4 rounded-xl border border-dashed border-border bg-card/60 p-6 text-left opacity-70"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <h2 className="font-display text-lg font-semibold">{title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </span>
              </div>
            )
          )}
        </div>

        <div className="w-full max-w-2xl rounded-xl border border-primary/20 bg-primary/5 p-6 text-left shadow-sm sm:flex sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UserPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                New staff member?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a Staff or Admin account to manage orders, menu, and inventory.
              </p>
            </div>
          </div>
          <Link
            href="/register"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:mt-0"
          >
            Register
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
