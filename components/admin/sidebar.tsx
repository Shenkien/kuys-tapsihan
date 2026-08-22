"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  FolderTree,
  Package,
  ChefHat,
  BarChart3,
  ReceiptText,
  Settings2,
  QrCode,
  Plus as PlusIcon,
  Layers,
  Truck,
  ClipboardList,
  Users,
  History,
  Download,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoLockup } from "@/components/logo";

// Grouped in the order a new admin should actually set things up in:
// menu/catalog first (nothing works without it), then the ordering
// channel itself, then inventory, then day-to-day operations, then
// system administration last.
const navGroups = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "1. Menu Setup",
    items: [
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/menu", label: "Menu Items", icon: UtensilsCrossed },
      { href: "/admin/add-ons", label: "Add-ons", icon: PlusIcon },
      { href: "/admin/combos", label: "Combo Meals", icon: Layers },
    ],
  },
  {
    title: "2. Ordering Channel",
    items: [{ href: "/admin/tables", label: "Tables & QR", icon: QrCode }],
  },
  {
    title: "3. Inventory",
    items: [
      { href: "/admin/inventory", label: "Inventory", icon: Package },
      { href: "/admin/recipes", label: "Recipes", icon: ChefHat },
      { href: "/admin/suppliers", label: "Suppliers", icon: Truck },
      { href: "/admin/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
    ],
  },
  {
    title: "4. Sales & Operations",
    items: [
      { href: "/admin/orders", label: "Order History", icon: ReceiptText },
      { href: "/admin/reports", label: "Sales Reports", icon: BarChart3 },
      { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
    ],
  },
  {
    title: "5. Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/audit-log", label: "Audit Log", icon: History },
      { href: "/admin/data-export", label: "Data Export", icon: Download },
      { href: "/admin/settings", label: "Settings", icon: Settings2 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:flex lg:flex-col lg:overflow-y-auto">
      <div className="border-b border-border px-5 py-5">
        <Link href="/admin">
          <LogoLockup variant="dark" />
        </Link>
      </div>

      <nav className="flex-1 space-y-5 p-3">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition",
                      active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
