"use client";

import Link from "next/link";
import { ArrowUpRight, Bug, HeartPulse, Server } from "lucide-react";
import { Card, CardContent, CardToolbar } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/shared/score-ring";
import { Delta } from "@/components/shared/delta";
import { UptimeStrip } from "@/components/charts/uptime-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { formatNumber, formatPercent } from "@/lib/format";
import { SEVERITY_LABELS } from "@/lib/scores";
import type { PortfolioSummary } from "@/lib/store/selectors";
import type { Issue, Severity, UptimeDay } from "@/types";
import { cn } from "@/lib/utils";

/** Headline health score for the current dashboard scope. */
export function HealthCard({
  summary,
  scopeLabel,
}: {
  summary: PortfolioSummary;
  scopeLabel: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardToolbar
        title="Overall health score"
        description={scopeLabel}
        action={<HeartPulse className="size-4 text-subtle-foreground" />}
      />
      {/*
        Ring and copy sit side by side only where there is genuinely room — at
        `lg` the three hero cards each get roughly a third of the viewport,
        which is too narrow for a two-column split.
      */}
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-4 text-center sm:flex-row sm:justify-start sm:text-left lg:flex-col lg:text-center 2xl:flex-row 2xl:text-left">
        <ScoreRing
          score={summary.health}
          size={124}
          label="Overall health score"
        />
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 sm:justify-start lg:justify-center 2xl:justify-start">
            <Delta value={summary.healthDelta} suffix=" pts" />
            <span className="text-xs text-subtle-foreground">vs. 30 days ago</span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground text-balance">
            Weighted from performance (40%), accessibility (25%), SEO (20%) and
            best practices (15%).
          </p>
          <p className="text-xs text-subtle-foreground">
            {formatNumber(summary.auditCount)} audits ·{" "}
            {summary.monitoredCount} of {summary.websiteCount} sites with results
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/** 30-day availability, with a per-day strip for at-a-glance incident spotting. */
export function UptimeCard({
  summary,
  uptimeDays,
}: {
  summary: PortfolioSummary;
  uptimeDays: UptimeDay[];
}) {
  const tone =
    summary.uptime >= 99.9
      ? "text-success"
      : summary.uptime >= 99
        ? "text-warning"
        : "text-danger";

  return (
    <Card className="flex flex-col">
      <CardToolbar
        title="Uptime"
        description="Rolling 30 days"
        action={<Server className="size-4 text-subtle-foreground" />}
      />
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="flex items-end justify-between gap-3">
          <p className={cn("font-mono text-4xl font-semibold tabular-nums", tone)}>
            {formatPercent(summary.uptime, 2)}
          </p>
          <Badge tone={summary.uptimeIncidents === 0 ? "success" : "warning"}>
            {summary.uptimeIncidents === 0
              ? "No incidents"
              : `${summary.uptimeIncidents} incident${summary.uptimeIncidents === 1 ? "" : "s"}`}
          </Badge>
        </div>

        {uptimeDays.length > 0 ? (
          <div className="space-y-1.5">
            <UptimeStrip data={uptimeDays} />
            <div className="flex justify-between text-[11px] text-subtle-foreground">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </div>
        ) : (
          <EmptyState
            compact
            icon={Server}
            title="No uptime history"
            description="Availability is recorded once monitoring is enabled."
          />
        )}
      </CardContent>
    </Card>
  );
}

const SEVERITY_BAR: Record<Severity, string> = {
  critical: "bg-danger",
  high: "bg-warning",
  medium: "bg-info",
  low: "bg-subtle-foreground",
};

/** Open findings broken down by severity. */
export function IssuesSummaryCard({ issues }: { issues: Issue[] }) {
  const severities: Severity[] = ["critical", "high", "medium", "low"];
  const counts = severities.map((severity) => ({
    severity,
    count: issues.filter((i) => i.severity === severity).length,
  }));
  const total = issues.length;

  return (
    <Card className="flex flex-col">
      <CardToolbar
        title="Open issues"
        description="Across the current selection"
        action={
          <Link
            href="/issues"
            className="inline-flex items-center gap-1 text-xs text-accent transition-colors hover:underline"
          >
            View all
            <ArrowUpRight className="size-3" />
          </Link>
        }
      />
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="flex items-end gap-3">
          <p className="font-mono text-4xl font-semibold text-foreground tabular-nums">
            {total}
          </p>
          <p className="pb-1.5 text-xs text-subtle-foreground">
            unresolved finding{total === 1 ? "" : "s"}
          </p>
        </div>

        {total === 0 ? (
          <EmptyState
            compact
            icon={Bug}
            title="Nothing outstanding"
            description="Every finding in scope is resolved or ignored."
          />
        ) : (
          <ul className="space-y-2">
            {counts.map(({ severity, count }) => (
              <li key={severity} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs text-muted-foreground">
                  {SEVERITY_LABELS[severity]}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                  <span
                    className={cn("block h-full rounded-full", SEVERITY_BAR[severity])}
                    style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
