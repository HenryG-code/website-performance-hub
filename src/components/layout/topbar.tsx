"use client";

import { usePathname } from "next/navigation";
import { GlobalSearch } from "./global-search";
import { MobileNav } from "./mobile-nav";
import { NotificationsMenu } from "./notifications-menu";
import { UserMenu } from "./user-menu";
import { titleForPath } from "@/lib/navigation";

/**
 * Sticky top bar: navigation trigger and page title on the left, search and
 * account controls on the right. Search drops to its own row on phones so the
 * title never gets squeezed out.
 */
export function Topbar() {
  const pathname = usePathname();
  const title = titleForPath(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <MobileNav />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          <p className="hidden truncate text-xs text-subtle-foreground sm:block">
            Phase 1 · local mock data
          </p>
        </div>

        <div className="hidden md:block">
          <GlobalSearch />
        </div>

        <NotificationsMenu />
        <UserMenu />
      </div>

      <div className="px-4 pb-3 md:hidden">
        <GlobalSearch />
      </div>
    </header>
  );
}
