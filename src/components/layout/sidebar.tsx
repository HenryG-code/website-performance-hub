"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { useAppStore } from "@/lib/store/app-store";
import { portfolioSummary } from "@/lib/store/selectors";
import { formatPercent } from "@/lib/format";

/** Fixed desktop sidebar. Hidden below `lg`, where the drawer takes over. */
export function Sidebar() {
  const { state } = useAppStore();
  const summary = portfolioSummary(state);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Link href="/" className="rounded-lg" aria-label="PerformanceHub home">
          <Logo />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks />
      </div>

      <div className="shrink-0 space-y-3 border-t border-border p-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-success" />
            <span className="text-xs font-medium text-foreground">
              Portfolio uptime
            </span>
          </div>
          <p className="mt-1.5 font-mono text-lg font-semibold text-success tabular-nums">
            {formatPercent(summary.uptime, 2)}
          </p>
          <p className="mt-0.5 text-[11px] text-subtle-foreground">
            {summary.monitoredCount} of {summary.websiteCount} sites monitored ·
            30 days
          </p>
        </div>

        <Link
          href="/reports"
          className="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-elevated hover:text-foreground"
        >
          Build a client report
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </aside>
  );
}
