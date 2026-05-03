"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, LayoutDashboard, Plus, BarChart3, Calendar, Scale, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/session/new", label: "Log Session", icon: Plus },
  { href: "/analytics/volume", label: "Volume", icon: BarChart3 },
  { href: "/analytics/frequency", label: "Frequency", icon: Calendar },
  { href: "/analytics/body-comp", label: "Body Comp", icon: Scale },
  { href: "/import", label: "Import", icon: Upload },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Dumbbell className="h-5 w-5 text-primary" />
          <span className="text-lg">Lift Lab</span>
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
