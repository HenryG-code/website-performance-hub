"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  FlaskConical,
  ListChecks,
  Monitor,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardToolbar } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatTile } from "@/components/shared/stat-tile";
import { ScoreRing } from "@/components/shared/score-ring";
import { SiteAvatar } from "@/components/shared/site-avatar";
import { AuditStatusBadge } from "@/components/shared/badges";
import { Delta } from "@/components/shared/delta";
import { FieldDataPanel } from "@/components/audits/field-data-panel";
import { IssueListRow } from "@/components/issues/issue-list";
import { IssueDetailSheet } from "@/components/issues/issue-detail-sheet";
import { useAppStore } from "@/lib/store/app-store";
import {
  BAND_HEX,
  SCORE_KEYS,
  SCORE_LABELS,
  scoreBand,
  sortBySeverity,
} from "@/lib/scores";
import { displayUrl, formatDateTime, formatDuration } from "@/lib/format";
import type { Issue } from "@/types";
import { cn } from "@/lib/utils";

export function AuditDetailView({
  auditId,
  passedChecks,
}: {
  auditId: string;
  /** Derived server-side from the stored provider response. */
  passedChecks: string[];
}) {
  const { state } = useAppStore();
  const [selectedIssue, setSelectedIssue] = React.useState<Issue | null>(null);

  const audit = state.audits.find((a) => a.id === auditId);
  const website = audit
    ? state.websites.find((w) => w.id === audit.websiteId)
    : undefined;

  const previous = React.useMemo(() => {
    if (!audit) return undefined;
    return state.audits
      .filter(
        (a) =>
          a.websiteId === audit.websiteId &&
          a.status === "completed" &&
          a.device === audit.device &&
          new Date(a.startedAt).getTime() < new Date(audit.startedAt).getTime(),
      )
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      )[0];
  }, [audit, state.audits]);

  const findings = React.useMemo(
    () =>
      audit
        ? state.issues.filter((i) => i.auditId === audit.id).sort(sortBySeverity)
        : [],
    [audit, state.issues],
  );

  if (!audit) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit not found" />
        <Card>
          <EmptyState
            icon={BarChart3}
            title="We couldn't find that audit"
            description="It may belong to a website that has since been removed."
            action={
              <Button asChild variant="outline">
                <Link href="/audits">
                  <ArrowLeft />
                  Back to audits
                </Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const DeviceIcon = audit.device === "mobile" ? Smartphone : Monitor;
  const completed = audit.status === "completed";
  const passRate = audit.totalChecks
    ? Math.round((audit.passedChecks / audit.totalChecks) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Link
        href="/audits"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All audits
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <SiteAvatar
              name={website?.name ?? "Unknown"}
              initials={website?.initials ?? "??"}
              size="lg"
            />
            <span className="min-w-0">
              <span className="block truncate">
                {website?.name ?? "Unknown website"}
              </span>
              {audit.finalUrl ? (
                <a
                  href={audit.finalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-normal text-accent hover:underline"
                >
                  {displayUrl(audit.finalUrl)}
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
            </span>
          </span>
        }
        actions={
          website ? (
            <Button asChild variant="outline">
              <Link href={`/websites/${website.id}`}>View website</Link>
            </Button>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <AuditStatusBadge status={audit.status} />
          <Badge tone="outline">
            <DeviceIcon className="size-3" />
            {audit.device}
          </Badge>
          {audit.provider === "pagespeed" ? (
            <Badge tone="primary">
              <ShieldCheck className="size-3" />
              Google PageSpeed Insights
            </Badge>
          ) : (
            <Badge tone="warning">
              <FlaskConical className="size-3" />
              Simulated — not measured
            </Badge>
          )}
          {audit.lighthouseVersion ? (
            <Badge tone="neutral" size="sm">
              Lighthouse {audit.lighthouseVersion}
            </Badge>
          ) : null}
          <span className="text-xs text-subtle-foreground">
            {formatDateTime(audit.analysedAt ?? audit.startedAt)}
          </span>
        </div>
      </PageHeader>

      {audit.provider === "simulated" ? (
        <Card className="border-warning/40 bg-warning-soft/40">
          <CardContent className="flex items-start gap-3">
            <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                This audit was generated, not measured
              </p>
              <p className="text-sm text-muted-foreground">
                It predates the live PageSpeed integration. Its scores, metrics
                and findings describe nothing real. Run a new audit to replace
                it, then remove the generated data from Settings.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {audit.status === "failed" ? (
        <Card className="border-danger/40 bg-danger-soft/40">
          <CardContent className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                This audit did not complete
              </p>
              <p className="text-sm text-muted-foreground">
                {audit.failureReason ??
                  "The run was aborted before any metrics were collected."}
              </p>
              {audit.errorCode ? (
                <p className="font-mono text-xs text-subtle-foreground">
                  {audit.errorCode}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {audit.status === "running" || audit.status === "queued" ? (
        <Card>
          <EmptyState
            icon={Clock}
            title={
              audit.status === "running" ? "Audit in progress" : "Audit queued"
            }
            description="Google is analysing the page. Results appear here as soon as the run finishes — usually within a minute."
          />
        </Card>
      ) : null}

      {completed ? (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardToolbar title="Health score" description="Weighted roll-up" />
              <CardContent className="flex items-center gap-5">
                <ScoreRing score={audit.healthScore} label="Audit health score" />
                <div className="space-y-2">
                  {previous ? (
                    <>
                      <Delta
                        value={audit.healthScore - previous.healthScore}
                        suffix=" pts"
                      />
                      <p className="text-xs text-subtle-foreground">
                        vs. previous {audit.device} run on{" "}
                        {formatDateTime(previous.startedAt).split(" · ")[0]}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-subtle-foreground">
                      First recorded {audit.device} run for this website.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardToolbar
                title="Category scores"
                description="Lighthouse categories for this run"
              />
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {SCORE_KEYS.map((key) => {
                  const score = audit.scores[key];
                  const band = scoreBand(score);
                  return (
                    <div key={key}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {SCORE_LABELS[key]}
                        </span>
                        <span className="flex items-center gap-2">
                          {previous ? (
                            <Delta
                              value={score - previous.scores[key]}
                              showZero={false}
                            />
                          ) : null}
                          <span
                            className="font-mono text-lg font-semibold tabular-nums"
                            style={{ color: BAND_HEX[band] }}
                          >
                            {score}
                          </span>
                        </span>
                      </div>
                      <Progress
                        value={score}
                        className="mt-2"
                        label={SCORE_LABELS[key]}
                        indicatorClassName={cn(
                          band === "good" && "bg-success",
                          band === "fair" && "bg-warning",
                          band === "poor" && "bg-danger",
                        )}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Run duration"
              value={formatDuration(audit.durationMs)}
              icon={Clock}
            />
            <StatTile
              label="Checks passed"
              value={`${audit.passedChecks}/${audit.totalChecks}`}
              icon={ListChecks}
              footer={
                <span className="text-subtle-foreground">{passRate}% pass rate</span>
              }
            />
            <StatTile
              label="Findings"
              value={audit.issuesFound}
              icon={TriangleAlert}
              valueClassName={audit.issuesFound > 0 ? "text-warning" : undefined}
            />
            <StatTile
              label="Strategy"
              value={audit.device === "mobile" ? "Mobile" : "Desktop"}
              icon={DeviceIcon}
              valueClassName="text-xl"
              footer={
                <span className="text-subtle-foreground capitalize">
                  {audit.trigger} run
                </span>
              }
            />
          </section>

          <Card>
            <CardToolbar
              title="Core Web Vitals"
              description="Lab measurements alongside real-user field data"
              action={<Zap className="size-4 text-subtle-foreground" />}
            />
            <CardContent>
              <FieldDataPanel
                lab={audit.vitals}
                labTtfbMs={audit.labTtfbMs}
                field={audit.field}
              />
            </CardContent>
          </Card>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardToolbar
                title="Findings from this run"
                description={`${findings.length} issue${findings.length === 1 ? "" : "s"} reported by Lighthouse`}
              />
              {findings.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  title="No findings"
                  description="Every scored Lighthouse check passed on this run."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {findings.map((issue) => (
                    <li key={issue.id}>
                      <IssueListRow
                        issue={issue}
                        onSelect={setSelectedIssue}
                        showWebsite={false}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardToolbar
                title="Passed checks"
                description="Verified by Lighthouse on this run"
              />
              <CardContent>
                {passedChecks.length === 0 ? (
                  <EmptyState
                    compact
                    icon={ListChecks}
                    title="No stored check detail"
                    description="The full provider response is not available for this audit."
                  />
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {passedChecks.map((check) => (
                      <li
                        key={check}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <CheckCircle2 className="mt-px size-3.5 shrink-0 text-success" />
                        {check}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          {audit.requestedUrl && audit.finalUrl &&
          audit.requestedUrl !== audit.finalUrl ? (
            <p className="text-xs text-subtle-foreground">
              Requested{" "}
              <span className="font-mono">{displayUrl(audit.requestedUrl)}</span>,
              analysed{" "}
              <span className="font-mono">{displayUrl(audit.finalUrl)}</span> after
              redirects.
            </p>
          ) : null}
        </>
      ) : null}

      <IssueDetailSheet
        issue={selectedIssue}
        onOpenChange={(open) => {
          if (!open) setSelectedIssue(null);
        }}
      />
    </div>
  );
}
