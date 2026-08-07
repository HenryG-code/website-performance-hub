"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
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
import { VitalsGrid } from "@/components/audits/vitals-grid";
import { IssueListRow } from "@/components/issues/issue-list";
import { IssueDetailSheet } from "@/components/issues/issue-detail-sheet";
import { useAppStore } from "@/lib/store/app-store";
import { PASSED_CHECKS } from "@/lib/mock/catalog";
import {
  BAND_HEX,
  SCORE_KEYS,
  SCORE_LABELS,
  scoreBand,
  sortBySeverity,
} from "@/lib/scores";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { Issue } from "@/types";
import { cn } from "@/lib/utils";

export default function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { state } = useAppStore();
  const [selectedIssue, setSelectedIssue] = React.useState<Issue | null>(null);

  const audit = state.audits.find((a) => a.id === id);
  const website = audit
    ? state.websites.find((w) => w.id === audit.websiteId)
    : undefined;

  // Compare against the previous completed run on the same site.
  const previous = React.useMemo(() => {
    if (!audit) return undefined;
    return state.audits
      .filter(
        (a) =>
          a.websiteId === audit.websiteId &&
          a.status === "completed" &&
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
              <span className="mt-1 block font-mono text-xs font-normal text-subtle-foreground">
                {audit.id}
              </span>
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
          <Badge tone="neutral">{audit.trigger}</Badge>
          <span className="text-xs text-subtle-foreground">
            {formatDateTime(audit.startedAt)}
          </span>
        </div>
      </PageHeader>

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
            </div>
          </CardContent>
        </Card>
      ) : null}

      {audit.status === "running" || audit.status === "queued" ? (
        <Card>
          <EmptyState
            icon={Clock}
            title={
              audit.status === "running"
                ? "Audit in progress"
                : "Audit queued"
            }
            description={
              audit.status === "running"
                ? "Metrics are still being collected. Results appear here as soon as the run finishes."
                : "This run is waiting for a free worker. It will start shortly."
            }
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
                        vs. previous run on{" "}
                        {formatDateTime(previous.startedAt).split(" · ")[0]}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-subtle-foreground">
                      First recorded run for this website.
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
              label="Duration"
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
              label="New findings"
              value={audit.issuesFound}
              icon={TriangleAlert}
              valueClassName={audit.issuesFound > 0 ? "text-warning" : undefined}
            />
            <StatTile
              label="Device profile"
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
              title="Lab metrics"
              description="Core Web Vitals and supporting timings captured during this run"
              action={<Zap className="size-4 text-subtle-foreground" />}
            />
            <CardContent>
              <VitalsGrid vitals={audit.vitals} />
            </CardContent>
          </Card>

          <section className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardToolbar
                title="Findings from this run"
                description={`${findings.length} issue${findings.length === 1 ? "" : "s"} opened`}
              />
              {findings.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  title="No new findings"
                  description="This run did not surface anything that wasn't already tracked."
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
                description="A sample of what this run verified as healthy"
              />
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {Object.values(PASSED_CHECKS)
                    .flat()
                    .slice(0, 12)
                    .map((check) => (
                      <li
                        key={check}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <CheckCircle2 className="mt-px size-3.5 shrink-0 text-success" />
                        {check}
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          </section>
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
