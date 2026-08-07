"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppStore } from "@/lib/store/app-store";
import { formatRelative } from "@/lib/format";
import { isActive } from "@/lib/scores";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  detail: string;
  at: string;
  href: string;
  icon: LucideIcon;
  tone: string;
}

/**
 * Notification centre. Phase 1 derives its feed from the local dataset — real
 * delivery (email, Slack, webhooks) is wired up in a later phase, which is what
 * the footer note tells the user.
 */
export function NotificationsMenu() {
  const { state } = useAppStore();

  const notifications = React.useMemo<Notification[]>(() => {
    const siteName = (id: string) =>
      state.websites.find((w) => w.id === id)?.name ?? "Unknown site";

    const criticals: Notification[] = state.issues
      .filter((i) => isActive(i) && i.severity === "critical")
      .slice(0, 4)
      .map((issue) => ({
        id: `issue-${issue.id}`,
        title: issue.title,
        detail: siteName(issue.websiteId),
        at: issue.foundAt,
        href: `/issues?issue=${issue.id}`,
        icon: ShieldAlert,
        tone: "text-danger",
      }));

    const audits: Notification[] = state.audits
      .filter((a) => a.status === "completed")
      .slice(0, 3)
      .map((audit) => ({
        id: `audit-${audit.id}`,
        title: `Audit completed · ${siteName(audit.websiteId)}`,
        detail: `Health score ${audit.healthScore} · ${audit.issuesFound} new finding${
          audit.issuesFound === 1 ? "" : "s"
        }`,
        at: audit.startedAt,
        href: `/audits/${audit.id}`,
        icon: CheckCircle2,
        tone: "text-success",
      }));

    // A failed run is the thing most worth interrupting someone about: the
    // dashboard is still showing older scores until it is re-run.
    const failures: Notification[] = state.websites
      .filter((w) => w.lastFailure !== null)
      .slice(0, 3)
      .map((website) => ({
        id: `failure-${website.id}`,
        title: `Audit failed for ${website.name}`,
        detail: website.lastFailure!.reason,
        at: website.lastFailure!.at,
        href: `/websites/${website.id}`,
        icon: TriangleAlert,
        tone: "text-warning",
      }));

    return [...criticals, ...failures, ...audits]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 7);
  }, [state]);

  const unread = notifications.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] leading-4 font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <span className="font-mono text-[11px] text-subtle-foreground tabular-nums">
            {unread}
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <EmptyState
              compact
              icon={Bell}
              title="You're all caught up"
              description="New audit results and critical findings will show up here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex gap-3 px-4 py-3 transition-colors hover:bg-hover"
                    >
                      <Icon className={cn("mt-0.5 size-4 shrink-0", item.tone)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground">
                          {item.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle-foreground">
                          <span className="truncate">{item.detail}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-subtle-foreground">
                        {formatRelative(item.at)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-4 py-2.5">
          <Link
            href="/settings"
            className="text-xs text-accent transition-colors hover:underline"
          >
            Manage notification preferences
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
