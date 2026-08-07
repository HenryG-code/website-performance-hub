"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CircleCheck,
  Minus,
  TriangleAlert,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/shared/score-ring";
import { Delta } from "@/components/shared/delta";
import { EmptyState } from "@/components/shared/empty-state";
import { SeverityBadge } from "@/components/shared/badges";
import { TrendChart } from "@/components/charts/trend-chart";
import {
  BAND_HEX,
  BAND_LABELS,
  SCORE_KEYS,
  SCORE_LABELS,
  scoreBand,
} from "@/lib/scores";
import { formatDate, formatPercent, displayUrl } from "@/lib/format";
import type { Issue, ScoreKey, Scores, TrendPoint, Website } from "@/types";

export interface ReportData {
  title: string;
  scopeLabel: string;
  periodDays: number;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  scores: Scores;
  previousScores: Scores;
  health: number;
  previousHealth: number;
  uptime: number;
  trend: TrendPoint[];
  websites: Website[];
  websiteIssueCounts: Record<string, number>;
  auditsRun: number;
  issuesResolved: number;
  issuesOpened: number;
  openIssues: Issue[];
  preparedBy: string;
  company: string;
}

/**
 * Client-ready report document. Styled as a standalone artefact — its own
 * header, sections and footer — so it reads as a deliverable rather than
 * another dashboard screen.
 */
export function ReportPreview({ data }: { data: ReportData }) {
  const healthDelta = data.health - data.previousHealth;
  const band = scoreBand(data.health);

  const movements = SCORE_KEYS.map((key) => ({
    key,
    score: data.scores[key],
    delta: data.scores[key] - data.previousScores[key],
  }));

  const improvements = movements
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta);
  const regressions = movements
    .filter((m) => m.delta < 0)
    .sort((a, b) => a.delta - b.delta);

  return (
    <article className="overflow-hidden rounded-card border border-border bg-card">
      {/* Report header */}
      <header className="border-b border-border bg-gradient-to-br from-primary-soft/60 to-transparent px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Logo />
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {data.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.scopeLabel} · {formatDate(data.periodStart)} –{" "}
                {formatDate(data.periodEnd)}
              </p>
            </div>
          </div>

          <dl className="space-y-1 text-right text-xs">
            <div>
              <dt className="inline text-subtle-foreground">Prepared by </dt>
              <dd className="inline text-foreground">{data.preparedBy}</dd>
            </div>
            <div>
              <dt className="inline text-subtle-foreground">Organisation </dt>
              <dd className="inline text-foreground">{data.company}</dd>
            </div>
            <div>
              <dt className="inline text-subtle-foreground">Generated </dt>
              <dd className="inline text-foreground">
                {formatDate(data.generatedAt)}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {/* Executive summary */}
      <Section title="Executive summary" index="01">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <ScoreRing score={data.health} size={124} label="Overall health" />

          <div className="flex-1 space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Across {data.websites.length} monitored{" "}
              {data.websites.length === 1 ? "website" : "websites"}, the overall
              health score is{" "}
              <strong className="font-semibold text-foreground">
                {data.health}
              </strong>{" "}
              ({BAND_LABELS[band].toLowerCase()}),{" "}
              {healthDelta === 0
                ? "unchanged over the reporting period"
                : healthDelta > 0
                  ? `up ${healthDelta} points over the reporting period`
                  : `down ${Math.abs(healthDelta)} points over the reporting period`}
              . Availability held at {formatPercent(data.uptime, 2)} with{" "}
              {data.auditsRun} audit{data.auditsRun === 1 ? "" : "s"} completed.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Health" value={String(data.health)} tone={BAND_HEX[band]}>
                <Delta value={healthDelta} suffix=" pts" showZero={false} />
              </Metric>
              <Metric label="Uptime" value={formatPercent(data.uptime, 2)} />
              <Metric label="Issues resolved" value={String(data.issuesResolved)} />
              <Metric label="New findings" value={String(data.issuesOpened)} />
            </div>
          </div>
        </div>
      </Section>

      {/* Score summary */}
      <Section title="Score summary" index="02">
        <div className="table-scroll">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                  Category
                </th>
                <th className="pb-2 text-right text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                  Start of period
                </th>
                <th className="pb-2 text-right text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                  Current
                </th>
                <th className="pb-2 text-right text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                  Change
                </th>
                <th className="pb-2 text-right text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map((movement) => {
                const rowBand = scoreBand(movement.score);
                return (
                  <tr key={movement.key}>
                    <td className="py-2.5 text-foreground">
                      {SCORE_LABELS[movement.key]}
                    </td>
                    <td className="py-2.5 text-right font-mono text-muted-foreground tabular-nums">
                      {data.previousScores[movement.key]}
                    </td>
                    <td
                      className="py-2.5 text-right font-mono font-semibold tabular-nums"
                      style={{ color: BAND_HEX[rowBand] }}
                    >
                      {movement.score}
                    </td>
                    <td className="py-2.5 text-right">
                      <Delta value={movement.delta} className="justify-end" />
                    </td>
                    <td className="py-2.5 text-right">
                      <Badge
                        tone={
                          rowBand === "good"
                            ? "success"
                            : rowBand === "fair"
                              ? "warning"
                              : "danger"
                        }
                        size="sm"
                      >
                        {BAND_LABELS[rowBand]}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Trend */}
      <Section title="Trend" index="03">
        {data.trend.length < 2 ? (
          <EmptyState
            compact
            icon={Minus}
            title="Not enough history for this period"
            description="Choose a longer reporting window, or run more audits to build up a trend."
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              Daily health score over the last {data.periodDays} days.
            </p>
            <TrendChart data={data.trend} mode="health" height={220} />
          </>
        )}
      </Section>

      {/* Improvements and regressions */}
      <Section title="What changed" index="04">
        <div className="grid gap-4 sm:grid-cols-2">
          <ChangeList
            title="Improvements"
            tone="success"
            icon={ArrowUpRight}
            items={improvements.map((m) => ({
              key: m.key,
              label: SCORE_LABELS[m.key],
              delta: m.delta,
            }))}
            emptyMessage="No category gained ground this period."
          />
          <ChangeList
            title="Regressions"
            tone="danger"
            icon={ArrowDownRight}
            items={regressions.map((m) => ({
              key: m.key,
              label: SCORE_LABELS[m.key],
              delta: m.delta,
            }))}
            emptyMessage="No category lost ground this period."
          />
        </div>
      </Section>

      {/* Per-site breakdown */}
      {data.websites.length > 1 ? (
        <Section title="Website breakdown" index="05">
          <div className="table-scroll">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                    Website
                  </th>
                  <th className="pb-2 text-right text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                    Health
                  </th>
                  <th className="pb-2 text-right text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                    Uptime
                  </th>
                  <th className="pb-2 text-right text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                    Open issues
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.websites.map((website) => {
                  const rowBand = scoreBand(website.healthScore);
                  return (
                    <tr key={website.id}>
                      <td className="py-2.5">
                        <span className="block text-foreground">{website.name}</span>
                        <span className="block text-xs text-subtle-foreground">
                          {displayUrl(website.url)}
                        </span>
                      </td>
                      <td
                        className="py-2.5 text-right font-mono font-semibold tabular-nums"
                        style={{
                          color: website.lastAuditAt
                            ? BAND_HEX[rowBand]
                            : "var(--color-subtle-foreground)",
                        }}
                      >
                        {website.lastAuditAt ? website.healthScore : "—"}
                      </td>
                      <td className="py-2.5 text-right font-mono text-muted-foreground tabular-nums">
                        {formatPercent(website.uptime30d, 2)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-muted-foreground tabular-nums">
                        {data.websiteIssueCounts[website.id] ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {/* Priority issues */}
      <Section
        title="Priority issues"
        index={data.websites.length > 1 ? "06" : "05"}
      >
        {data.openIssues.length === 0 ? (
          <EmptyState
            compact
            icon={CircleCheck}
            title="No outstanding findings"
            description="Everything raised during this period has been resolved or ignored."
          />
        ) : (
          <ol className="space-y-3">
            {data.openIssues.map((issue, index) => {
              const site = data.websites.find((w) => w.id === issue.websiteId);
              return (
                <li
                  key={issue.id}
                  className="flex gap-3 rounded-lg border border-border bg-surface p-3"
                >
                  <span className="font-mono text-xs text-subtle-foreground tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={issue.severity} size="sm" />
                      <span className="text-sm font-medium text-foreground">
                        {issue.title}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {issue.recommendation}
                    </p>
                    <p className="text-[11px] text-subtle-foreground">
                      {site?.name ?? "Unknown site"} · +{issue.scoreImpact} points
                      if fixed · {issue.effort} effort
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4 sm:px-8">
        <p className="flex items-center gap-1.5 text-[11px] text-subtle-foreground">
          <TriangleAlert className="size-3.5" />
          Generated from local demo data — figures are illustrative.
        </p>
        <p className="text-[11px] text-subtle-foreground">
          PerformanceHub · {formatDate(data.generatedAt)}
        </p>
      </footer>
    </article>
  );
}

function Section({
  title,
  index,
  children,
}: {
  title: string;
  index: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border px-6 py-6 last:border-b-0 sm:px-8">
      <h3 className="mb-4 flex items-center gap-2.5 text-xs font-semibold tracking-wide text-subtle-foreground uppercase">
        <span className="font-mono text-accent">{index}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: string;
  tone?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-2.5">
      <p className="text-[11px] text-subtle-foreground">{label}</p>
      <p
        className="mt-0.5 font-mono text-lg font-semibold tabular-nums"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </p>
      {children}
    </div>
  );
}

function ChangeList({
  title,
  tone,
  icon: Icon,
  items,
  emptyMessage,
}: {
  title: string;
  tone: "success" | "danger";
  icon: React.ElementType;
  items: { key: ScoreKey; label: string; delta: number }[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h4
        className={`flex items-center gap-1.5 text-xs font-semibold ${
          tone === "success" ? "text-success" : "text-danger"
        }`}
      >
        <Icon className="size-3.5" />
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-subtle-foreground">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">{item.label}</span>
              <Delta value={item.delta} suffix=" pts" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
