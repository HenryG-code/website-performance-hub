"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Bug,
  CalendarClock,
  ExternalLink,
  Gauge,
  Globe,
  Loader2,
  Server,
  Timer,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardToolbar } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatTile } from "@/components/shared/stat-tile";
import { SiteAvatar } from "@/components/shared/site-avatar";
import { Delta } from "@/components/shared/delta";
import { WebsiteStatusBadge } from "@/components/shared/badges";
import { ScoreCards } from "@/components/dashboard/score-cards";
import { TrendCard } from "@/components/dashboard/trend-card";
import {
  PriorityIssuesCard,
  RecentAuditsCard,
} from "@/components/dashboard/panels";
import { RunAuditButton } from "@/components/dashboard/run-audit-button";
import { CategoryFindings } from "@/components/websites/category-findings";
import { UptimeChart } from "@/components/charts/uptime-chart";
import { IssueDetailSheet } from "@/components/issues/issue-detail-sheet";
import { useAppStore } from "@/lib/store/app-store";
import {
  auditsForWebsite,
  categoryBreakdown,
  issuesForWebsite,
} from "@/lib/store/selectors";
import { SCORE_LABELS, isActive, sortBySeverity } from "@/lib/scores";
import {
  displayUrl,
  formatDate,
  formatPercent,
  formatRelative,
} from "@/lib/format";
import type { Issue, IssueCategory, ScoreKey } from "@/types";

const CATEGORY_FOR_KEY: Record<ScoreKey, IssueCategory> = {
  performance: "performance",
  seo: "seo",
  accessibility: "accessibility",
  bestPractices: "best-practices",
};

export default function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const { state, removeWebsite } = useAppStore();
  const { toast } = useToast();

  const [selectedIssue, setSelectedIssue] = React.useState<Issue | null>(null);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  const website = state.websites.find((w) => w.id === id);

  const audits = React.useMemo(
    () => (website ? auditsForWebsite(state, website.id) : []),
    [state, website],
  );
  const issues = React.useMemo(
    () => (website ? issuesForWebsite(state, website.id) : []),
    [state, website],
  );
  const trend = React.useMemo(
    () => (website ? (state.trends[website.id] ?? []) : []),
    [state.trends, website],
  );
  const uptime = React.useMemo(
    () => (website ? (state.uptime[website.id] ?? []) : []),
    [state.uptime, website],
  );

  const breakdown = React.useMemo(
    () => (website ? categoryBreakdown(website.scores, trend, issues) : []),
    [website, trend, issues],
  );

  if (!website) {
    return (
      <div className="space-y-6">
        <PageHeader title="Website not found" />
        <Card>
          <EmptyState
            icon={Globe}
            title="We couldn't find that website"
            description="It may have been removed from this workspace, or the link is out of date."
            action={
              <Button asChild variant="outline">
                <Link href="/websites">
                  <ArrowLeft />
                  Back to websites
                </Link>
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const openIssues = issues.filter(isActive);
  const latestCompleted = audits.find((a) => a.status === "completed");
  // A 30-day comparison needs 30 days of history; a site audited last week has
  // no baseline to compare against, so say so rather than reporting "no change".
  const hasBaseline = trend.length > 31;
  const healthDelta = hasBaseline
    ? website.healthScore - trend[trend.length - 31].health
    : 0;

  async function handleRemove() {
    setRemoving(true);
    const result = await removeWebsite(website!.id);
    setRemoving(false);

    if (!result.ok) {
      toast({
        tone: "warning",
        title: "Couldn't remove that website",
        description: result.error,
      });
      return;
    }

    setConfirmRemove(false);
    toast({
      tone: "warning",
      title: `${website!.name} removed`,
      description: "Its audits and issues were deleted along with it.",
    });
    router.push("/websites");
  }

  return (
    <div className="space-y-6">
      <Link
        href="/websites"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All websites
      </Link>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <SiteAvatar
              name={website.name}
              initials={website.initials}
              size="lg"
            />
            <span className="min-w-0">
              <span className="block truncate">{website.name}</span>
              <a
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-normal text-accent hover:underline"
              >
                {displayUrl(website.url)}
                <ExternalLink className="size-3" />
              </a>
            </span>
          </span>
        }
        actions={
          <>
            <RunAuditButton websiteIds={[website.id]} />
            <Button
              variant="outline"
              size="icon"
              aria-label="Remove website"
              onClick={() => setConfirmRemove(true)}
            >
              <Trash2 />
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <WebsiteStatusBadge status={website.status} />
          <Badge tone="outline">{website.team}</Badge>
          <Badge tone={website.environment === "staging" ? "warning" : "neutral"}>
            {website.environment === "staging" ? "Staging" : "Production"}
          </Badge>
          {website.tags.map((tag) => (
            <Badge key={tag} tone="neutral" size="sm">
              #{tag}
            </Badge>
          ))}
          <span className="text-xs text-subtle-foreground">
            Monitored since {formatDate(website.monitoringSince)}
          </span>
        </div>
      </PageHeader>

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="Overview metrics"
      >
        <StatTile
          label="Health score"
          value={website.lastAuditAt ? website.healthScore : "—"}
          icon={Gauge}
          footer={
            hasBaseline ? (
              <Delta value={healthDelta} suffix=" pts vs. 30d" />
            ) : (
              <span className="text-subtle-foreground">
                Building a 30-day baseline
              </span>
            )
          }
        />
        <StatTile
          label="Uptime (30 days)"
          value={formatPercent(website.uptime30d, 2)}
          icon={Server}
          valueClassName={
            website.uptime30d >= 99.9
              ? "text-success"
              : website.uptime30d >= 99
                ? "text-warning"
                : "text-danger"
          }
          footer={
            <span className="text-subtle-foreground">
              {uptime.reduce((sum, day) => sum + day.incidents, 0)} incidents
            </span>
          }
        />
        <StatTile
          label="Avg. response"
          value={website.avgResponseMs ? `${website.avgResponseMs}ms` : "—"}
          icon={Timer}
          footer={
            <span className="text-subtle-foreground">Origin, 30-day mean</span>
          }
        />
        <StatTile
          label="Open issues"
          value={openIssues.length}
          icon={Bug}
          footer={
            <span className="text-subtle-foreground">
              {openIssues.filter((i) => i.severity === "critical").length} critical
            </span>
          }
        />
        <StatTile
          label="Last audit"
          value={
            website.lastAuditAt ? formatRelative(website.lastAuditAt) : "Never"
          }
          icon={CalendarClock}
          valueClassName="text-xl"
          footer={
            <span className="text-subtle-foreground">
              {audits.length} run{audits.length === 1 ? "" : "s"} recorded
            </span>
          }
        />
      </section>

      {website.lastAuditAt ? (
        <>
          <section aria-label="Category scores">
            <ScoreCards
              breakdown={breakdown}
              trend={trend}
              idPrefix={`site-${website.id}`}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <TrendCard
                trend={trend}
                description={`Score history for ${website.name}`}
              />
            </div>

            <Card className="flex flex-col">
              <CardToolbar
                title="Availability"
                description="Daily uptime, last 30 days"
                action={<Activity className="size-4 text-subtle-foreground" />}
              />
              <CardContent className="flex-1">
                {uptime.length > 0 ? (
                  <UptimeChart data={uptime} height={220} />
                ) : (
                  <EmptyState
                    icon={Server}
                    title="No availability data"
                    description="Uptime is recorded from the first audit onwards."
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <section aria-label="Findings by category">
            <Tabs defaultValue="performance">
              <TabsList className="flex w-full overflow-x-auto sm:w-auto">
                {(Object.keys(CATEGORY_FOR_KEY) as ScoreKey[]).map((key) => (
                  <TabsTrigger key={key} value={key}>
                    {SCORE_LABELS[key]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {(Object.keys(CATEGORY_FOR_KEY) as ScoreKey[]).map((key) => {
                const category = CATEGORY_FOR_KEY[key];
                const entry = breakdown.find((b) => b.key === key);
                return (
                  <TabsContent key={key} value={key}>
                    <CategoryFindings
                      category={category}
                      score={website.scores[key]}
                      delta={entry?.delta ?? 0}
                      issues={issues.filter((i) => i.category === category)}
                      latestAudit={latestCompleted}
                      onSelectIssue={setSelectedIssue}
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <RecentAuditsCard
              audits={audits.slice(0, 6)}
              websites={state.websites}
              showWebsite={false}
              href={`/audits?website=${website.id}`}
            />
            <PriorityIssuesCard
              issues={[...openIssues].sort(sortBySeverity).slice(0, 6)}
              websites={state.websites}
              onSelect={setSelectedIssue}
              showWebsite={false}
              href={`/issues?website=${website.id}`}
            />
          </section>
        </>
      ) : (
        <Card>
          <EmptyState
            icon={Gauge}
            title="No audit results yet"
            description={`${website.name} is set up for monitoring but hasn't been audited. Run the first audit to populate scores, trends and findings.`}
            action={<RunAuditButton websiteIds={[website.id]} />}
          />
        </Card>
      )}

      <IssueDetailSheet
        issue={selectedIssue}
        onOpenChange={(open) => {
          if (!open) setSelectedIssue(null);
        }}
      />

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {website.name}?</DialogTitle>
            <DialogDescription>
              This removes the website along with its {audits.length} audit
              {audits.length === 1 ? "" : "s"} and {issues.length} finding
              {issues.length === 1 ? "" : "s"} from this workspace.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="text-sm text-muted-foreground">
            You can restore the full demo dataset at any time from the account
            menu.
          </DialogBody>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmRemove(false)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemove} disabled={removing}>
              {removing ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {removing ? "Removing…" : "Remove website"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
