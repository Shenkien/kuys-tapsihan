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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoLockup } from "@/components/logo";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/inventory", label: "Inventory", icon: Package },
  { href: "/admin/recipes", label: "Recipes", icon: ChefHat },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
      <div className="border-b border-border px-5 py-5">
        <Link href="/admin">
          <LogoLockup variant="dark" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}

        <div className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground opacity-60">
          <BarChart3 className="h-4 w-4" />
          Sales Reports
          <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px]">Soon</span>
        </div>
      </nav>
    </aside>
  );
}
