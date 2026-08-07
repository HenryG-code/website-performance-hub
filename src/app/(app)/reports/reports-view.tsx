"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileText, Globe, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ALL_WEBSITES,
  WebsiteSelector,
} from "@/components/dashboard/website-selector";
import { ReportPreview, type ReportData } from "@/components/reports/report-preview";
import { useAppStore } from "@/lib/store/app-store";
import {
  aggregateTrend,
  lastDays,
  portfolioSummary,
  websiteIssueCount,
} from "@/lib/store/selectors";
import { isActive, sortBySeverity } from "@/lib/scores";
import type { Scores } from "@/types";

const PERIODS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export function ReportsView({ generatedAt }: { generatedAt: string }) {
  const { state } = useAppStore();
  const { toast } = useToast();

  const [scope, setScope] = React.useState(ALL_WEBSITES);
  const [period, setPeriod] = React.useState("30");

  const periodDays = Number(period);
  const now = new Date(generatedAt).getTime();

  const scopedWebsites = React.useMemo(
    () =>
      scope === ALL_WEBSITES
        ? state.websites
        : state.websites.filter((w) => w.id === scope),
    [scope, state.websites],
  );

  const scopedIds = React.useMemo(
    () => scopedWebsites.map((w) => w.id),
    [scopedWebsites],
  );

  const report = React.useMemo<ReportData | null>(() => {
    if (scopedWebsites.length === 0) return null;

    const summary = portfolioSummary(state, scopedIds);
    const fullTrend = aggregateTrend(state, scopedIds);
    const trend = lastDays(fullTrend, periodDays);
    const first = trend[0];

    const previousScores: Scores = first
      ? {
          performance: first.performance,
          seo: first.seo,
          accessibility: first.accessibility,
          bestPractices: first.bestPractices,
        }
      : summary.scores;

    const cutoff = now - periodDays * 86_400_000;
    const scopedIssues = state.issues.filter((i) => scopedIds.includes(i.websiteId));

    const openIssues = scopedIssues
      .filter(isActive)
      .sort(sortBySeverity)
      .slice(0, 8);

    return {
      title:
        scope === ALL_WEBSITES
          ? state.settings.reportTitle
          : `${scopedWebsites[0].name} performance report`,
      scopeLabel:
        scope === ALL_WEBSITES
          ? `${scopedWebsites.length} websites`
          : scopedWebsites[0].team,
      periodDays,
      periodStart: trend[0]?.date ?? new Date(cutoff).toISOString(),
      periodEnd: trend[trend.length - 1]?.date ?? new Date(now).toISOString(),
      generatedAt: new Date(now).toISOString(),
      scores: summary.scores,
      previousScores,
      health: summary.health,
      previousHealth: first?.health ?? summary.health,
      uptime: summary.uptime,
      trend,
      websites: scopedWebsites,
      websiteIssueCounts: Object.fromEntries(
        scopedWebsites.map((w) => [w.id, websiteIssueCount(state, w.id)]),
      ),
      auditsRun: state.audits.filter(
        (a) =>
          scopedIds.includes(a.websiteId) &&
          new Date(a.startedAt).getTime() >= cutoff,
      ).length,
      issuesResolved: scopedIssues.filter(
        (i) =>
          i.status === "resolved" && new Date(i.updatedAt).getTime() >= cutoff,
      ).length,
      issuesOpened: scopedIssues.filter(
        (i) => new Date(i.foundAt).getTime() >= cutoff,
      ).length,
      openIssues,
      preparedBy: state.settings.profile.name || state.settings.profile.email,
      company:
        state.settings.brandName || state.settings.profile.company || "—",
    };
  }, [state, scope, scopedIds, scopedWebsites, periodDays, now]);

  function comingSoon(format: string) {
    toast({
      tone: "info",
      title: `${format} export is coming soon`,
      description:
        "Report generation ships with the reporting service in phase 3. The preview below is the layout it will produce.",
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="A client-ready summary of scores, trends and the work that will move them most. Choose a scope and period, then export."
        actions={
          <>
            <WebsiteSelector
              websites={state.websites}
              value={scope}
              onChange={setScope}
            />
            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList>
                {PERIODS.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Download />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export this report</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => comingSoon("PDF")}>
                  <FileText />
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => comingSoon("CSV")}>
                  <FileSpreadsheet />
                  Download as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => comingSoon("Share link")}>
                  <Share2 />
                  Create share link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {report ? (
        <ReportPreview data={report} />
      ) : (
        <Card>
          <EmptyState
            icon={Globe}
            title="Nothing to report on yet"
            description="Add a website and run an audit — the report builds itself from the results."
          />
        </Card>
      )}
    </div>
  );
}
