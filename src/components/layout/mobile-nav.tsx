"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLinks } from "./nav-links";
import { Logo } from "./logo";
import { useAppStore } from "@/lib/store/app-store";
import { portfolioSummary } from "@/lib/store/selectors";
import { formatPercent } from "@/lib/format";
import { NAV_ITEMS, isActivePath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Slide-in navigation drawer, shown below the `lg` breakpoint. */
export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const { state } = useAppStore();
  const summary = portfolioSummary(state);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-4" />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="max-w-72">
        <SheetHeader>
          <SheetTitle asChild>
            <Link href="/" onClick={() => setOpen(false)}>
              <Logo />
            </Link>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Primary navigation
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <p className="text-[11px] tracking-wide text-subtle-foreground uppercase">
            Portfolio uptime
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-success tabular-nums">
            {formatPercent(summary.uptime, 2)}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Bottom tab bar for phones. Duplicating the top five destinations here keeps
 * the primary routes one tap away without opening the drawer.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const items = NAV_ITEMS.slice(0, 5);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur sm:hidden"
      aria-label="Primary"
    >
      <ul className="flex">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-accent" : "text-subtle-foreground",
                )}
              >
                <Icon className="size-4.5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
