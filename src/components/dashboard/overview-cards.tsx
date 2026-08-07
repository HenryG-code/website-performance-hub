"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Bug,
  HeartPulse,
  Timer,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Card, CardContent, CardToolbar } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/shared/score-ring";
import { Delta } from "@/components/shared/delta";
import { EmptyState } from "@/components/shared/empty-state";
import { formatNumber } from "@/lib/format";
import { SEVERITY_LABELS } from "@/lib/scores";
import type { PortfolioSummary } from "@/lib/store/selectors";
import type { Issue, Severity, Website } from "@/types";
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
            Weighted from Lighthouse performance (40%), accessibility (25%), SEO
            (20%) and best practices (15%).
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

const CRUX_TONE: Record<string, string> = {
  FAST: "text-success",
  AVERAGE: "text-warning",
  SLOW: "text-danger",
};

function msLabel(value: number | null): string {
  if (value === null) return "—";
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

/**
 * Real-user data from the Chrome UX Report.
 *
 * Replaces the uptime card from earlier phases, which showed numbers no probe
 * ever measured. CrUX is genuinely observed field data — and when Google has
 * none for a site, this says so rather than filling the space.
 */
export function FieldDataCard({
  websites,
  summary,
}: {
  websites: Website[];
  summary: PortfolioSummary;
}) {
  const withField = websites.filter((site) => site.field !== null);

  // Worst LCP in the portfolio is the number worth surfacing: it is the metric
  // most users actually feel, and the slowest site sets the expectation.
  const worst = withField
    .filter((site) => site.field?.lcpMs != null)
    .sort((a, b) => (b.field!.lcpMs ?? 0) - (a.field!.lcpMs ?? 0))[0];

  return (
    <Card className="flex flex-col">
      <CardToolbar
        title="Real-user data"
        description="Chrome UX Report, trailing 28 days"
        action={<Users className="size-4 text-subtle-foreground" />}
      />
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        {withField.length === 0 ? (
          <EmptyState
            compact
            icon={Users}
            title="No field data available"
            description="Google only reports real-user metrics for sites with enough Chrome traffic. Lab results are still shown throughout."
          />
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-subtle-foreground">Slowest real LCP</p>
                <p
                  className={cn(
                    "mt-1 font-mono text-3xl font-semibold tabular-nums",
                    CRUX_TONE[worst?.field?.categories?.lcp ?? ""] ??
                      "text-foreground",
                  )}
                >
                  {msLabel(worst?.field?.lcpMs ?? null)}
                </p>
              </div>
              <Badge tone={withField.length === websites.length ? "success" : "neutral"}>
                {withField.length} of {websites.length} sites
              </Badge>
            </div>

            <ul className="space-y-2">
              {withField.slice(0, 4).map((site) => (
                <li key={site.id} className="flex items-center gap-3 text-xs">
                  <Link
                    href={`/websites/${site.id}`}
                    className="min-w-0 flex-1 truncate text-muted-foreground hover:text-foreground"
                  >
                    {site.name}
                  </Link>
                  <span className="shrink-0 text-[11px] text-subtle-foreground">
                    {site.field?.scope === "origin" ? "origin" : "page"}
                  </span>
                  <span
                    className={cn(
                      "w-16 shrink-0 text-right font-mono tabular-nums",
                      CRUX_TONE[site.field?.categories?.lcp ?? ""] ??
                        "text-muted-foreground",
                    )}
                  >
                    {msLabel(site.field?.lcpMs ?? null)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {summary.medianTtfbMs !== null ? (
          <p className="flex items-center gap-1.5 border-t border-border pt-3 text-[11px] text-subtle-foreground">
            <Timer className="size-3" />
            Median measured server response {msLabel(summary.medianTtfbMs)} (lab)
          </p>
        ) : null}
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
export function IssuesSummaryCard({
  issues,
  failedCount,
}: {
  issues: Issue[];
  failedCount: number;
}) {
  const severities: Severity[] = ["critical", "high", "medium", "low"];
  const counts = severities.map((severity) => ({
    severity,
    count: issues.filter((i) => i.severity === severity).length,
  }));
  const total = issues.length;

  return (
    <Card className="flex flex-col">
      <CardToolbar
        title="Open findings"
        description="Reported by the latest audits"
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
            description="Run an audit to collect findings for the sites in scope."
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

        {failedCount > 0 ? (
          <p className="flex items-center gap-1.5 border-t border-border pt-3 text-[11px] text-warning">
            <TriangleAlert className="size-3" />
            {failedCount} site{failedCount === 1 ? "'s" : "s'"} most recent audit
            failed
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
