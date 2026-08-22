import { auth, signOut } from "@/auth";
import Link from "next/link";
import {
  UserPlus,
  LogOut,
  UtensilsCrossed,
  FolderTree,
  Package,
  ChefHat,
  ArrowRight,
} from "lucide-react";
import { StatsCard } from "@/components/admin/stats-card";
import { LowStockAlert } from "@/components/admin/low-stock-alert";
import { getDashboardStats, getLowStockAlert } from "@/lib/dashboard";

const quickLinks = [
  {
    href: "/admin/menu",
    title: "Menu Management",
    desc: "Categories, items, pricing, availability.",
    icon: UtensilsCrossed,
  },
  {
    href: "/admin/categories",
    title: "Categories",
    desc: "Organize the menu into sections.",
    icon: FolderTree,
  },
  {
    href: "/admin/inventory",
    title: "Inventory",
    desc: "Stock levels, restocking, low-stock alerts.",
    icon: Package,
  },
  {
    href: "/admin/recipes",
    title: "Recipes",
    desc: "Link menu items to the ingredients they consume.",
    icon: ChefHat,
  },
];

export default async function AdminDashboardPage() {
  const session = await auth();
  const [stats, lowStock] = await Promise.all([getDashboardStats(), getLowStockAlert()]);

  return (
    <main className="min-h-full bg-background">
      <div className="border-b border-border bg-card">
        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as {session?.user?.name} ({session?.user?.email})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/register"
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              <UserPlus className="h-4 w-4" />
              Create Staff Account
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium transition hover:bg-secondary">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard label="Menu Items" value={stats.menu.total} icon={UtensilsCrossed} hint={`${stats.menu.available} available`} />
          <StatsCard label="Categories" value={stats.categories} icon={FolderTree} />
          <StatsCard
            label="Inventory Items"
            value={stats.inventory.total}
            icon={Package}
            hint={stats.inventory.lowStock > 0 ? `${stats.inventory.lowStock} low on stock` : undefined}
            tone={stats.inventory.lowStock > 0 ? "warning" : "default"}
          />
          <StatsCard label="Total Orders" value={stats.totalOrders} icon={ChefHat} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="font-display text-lg font-semibold">Manage</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {quickLinks.map(({ href, title, desc, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-start gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-brand"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="flex items-center gap-1 font-display font-semibold">
                      {title}
                      <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold">Stock Watch</h2>
            <div className="mt-3">
              <LowStockAlert items={lowStock} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
