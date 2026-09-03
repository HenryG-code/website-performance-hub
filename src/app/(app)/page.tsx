"use client";

import * as React from "react";
import Link from "next/link";
import { Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ALL_WEBSITES,
  WebsiteSelector,
} from "@/components/dashboard/website-selector";
import { RunAuditButton } from "@/components/dashboard/run-audit-button";
import { ScoreCards } from "@/components/dashboard/score-cards";
import {
  FieldDataCard,
  HealthCard,
  IssuesSummaryCard,
} from "@/components/dashboard/overview-cards";
import { TrendCard } from "@/components/dashboard/trend-card";
import {
  PriorityIssuesCard,
  RecentAuditsCard,
} from "@/components/dashboard/panels";
import { IssueDetailSheet } from "@/components/issues/issue-detail-sheet";
import { useAppStore } from "@/lib/store/app-store";
import {
  aggregateTrend,
  categoryBreakdown,
  portfolioSummary,
  priorityIssues,
  recentAudits,
} from "@/lib/store/selectors";
import { isActive } from "@/lib/scores";
import type { Issue } from "@/types";

export default function DashboardPage() {
  const { state } = useAppStore();
  const [scope, setScope] = React.useState<string>(ALL_WEBSITES);
  const [selectedIssue, setSelectedIssue] = React.useState<Issue | null>(null);

  // A scope of "all" resolves to every website; otherwise a single-site array.
  const scopedIds = React.useMemo(
    () =>
      scope === ALL_WEBSITES
        ? state.websites.map((w) => w.id)
        : state.websites.filter((w) => w.id === scope).map((w) => w.id),
    [scope, state.websites],
  );

  const summary = React.useMemo(
    () => portfolioSummary(state, scopedIds),
    [state, scopedIds],
  );

  const trend = React.useMemo(
    () => aggregateTrend(state, scopedIds),
    [state, scopedIds],
  );

  const scopedIssues = React.useMemo(
    () => state.issues.filter((i) => scopedIds.includes(i.websiteId)),
    [state.issues, scopedIds],
  );

  const breakdown = React.useMemo(
    () => categoryBreakdown(summary.scores, trend, scopedIssues),
    [summary.scores, trend, scopedIssues],
  );

  const scopedWebsites = React.useMemo(
    () => state.websites.filter((w) => scopedIds.includes(w.id)),
    [state.websites, scopedIds],
  );

  const audits = React.useMemo(
    () => recentAudits(state, 6, scopedIds),
    [state, scopedIds],
  );

  const priority = React.useMemo(
    () => priorityIssues(state, 6, scopedIds),
    [state, scopedIds],
  );

  const scopeLabel =
    scope === ALL_WEBSITES
      ? `${state.websites.length} website${state.websites.length === 1 ? "" : "s"} in scope`
      : (state.websites.find((w) => w.id === scope)?.name ?? "Unknown website");

  if (state.websites.length === 0) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          title="Dashboard"
          description="Track performance, SEO, accessibility and best practices across every website you manage."
        />
        <Card>
          <EmptyState
            icon={Globe}
            title="No websites yet"
            description="Add your first website, then run an audit to start building its score history and findings."
            action={
              <Button asChild>
                <Link href="/websites">
                  <Plus />
                  Add a website
                </Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Website health overview"
        description="One place to see how every site you manage is performing, where it is losing ground, and what to fix first."
        actions={
          <>
            <WebsiteSelector
              websites={state.websites}
              value={scope}
              onChange={setScope}
            />
            <RunAuditButton websiteIds={scopedIds} />
          </>
        }
      />

      <section
        className="grid gap-4 lg:grid-cols-3"
        aria-label="Portfolio summary"
      >
        <HealthCard summary={summary} scopeLabel={scopeLabel} />
        <FieldDataCard websites={scopedWebsites} summary={summary} />
        <IssuesSummaryCard
          issues={scopedIssues.filter(isActive)}
          failedCount={summary.failedCount}
        />
      </section>

      <section aria-label="Category scores">
        <ScoreCards breakdown={breakdown} trend={trend} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TrendCard trend={trend} description={scopeLabel} />
        </div>
        <RecentAuditsCard audits={audits} websites={state.websites} />
      </section>

      <PriorityIssuesCard
        issues={priority}
        websites={state.websites}
        onSelect={setSelectedIssue}
      />

      <IssueDetailSheet
        issue={selectedIssue}
        onOpenChange={(open) => {
          if (!open) setSelectedIssue(null);
        }}
      />
    </div>
  );
}
