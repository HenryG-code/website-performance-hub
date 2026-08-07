"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActivePath } from "@/lib/navigation";
import { useAppStore } from "@/lib/store/app-store";
import { isActive as isIssueActive } from "@/lib/scores";
import { cn } from "@/lib/utils";

/**
 * Shared navigation list, rendered by both the desktop sidebar and the mobile
 * drawer so the two can never drift apart.
 */
export function NavLinks({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { state } = useAppStore();
  const openIssues = state.issues.filter(isIssueActive).length;

  return (
    <nav className={cn("space-y-0.5", className)} aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;
        const badgeValue = item.badge === "openIssues" ? openIssues : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary-soft text-foreground"
                : "text-muted-foreground hover:bg-elevated hover:text-foreground",
            )}
          >
            {active ? (
              <span
                className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
                aria-hidden
              />
            ) : null}
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors",
                active ? "text-accent" : "text-subtle-foreground group-hover:text-muted-foreground",
              )}
            />
            <span className="flex-1 truncate font-medium">{item.label}</span>
            {badgeValue > 0 ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                  active
                    ? "bg-accent/15 text-accent"
                    : "bg-elevated text-subtle-foreground",
                )}
              >
                {badgeValue}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
