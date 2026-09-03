"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Bug, SearchX, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatTile } from "@/components/shared/stat-tile";
import {
  ALL,
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/shared/filters";
import { IssueCards, IssueTable } from "@/components/issues/issue-table";
import { IssueDetailSheet } from "@/components/issues/issue-detail-sheet";
import { useAppStore } from "@/lib/store/app-store";
import {
  CATEGORY_LABELS,
  ISSUE_CATEGORIES,
  ISSUE_STATUSES,
  SEVERITY_LABELS,
  STATUS_LABELS,
  isActive,
  sortBySeverity,
} from "@/lib/scores";
import type { Issue, IssueStatus, Severity } from "@/types";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const PAGE_SIZE = 25;

function IssuesView({
  initialWebsite,
  initialIssueId,
}: {
  initialWebsite: string;
  initialIssueId: string | null;
}) {
  const { state, setIssueStatus } = useAppStore();
  const { toast } = useToast();

  const [query, setQuery] = React.useState("");
  const [severity, setSeverity] = React.useState(ALL);
  const [category, setCategory] = React.useState(ALL);
  const [website, setWebsite] = React.useState(initialWebsite);
  const [status, setStatus] = React.useState(ALL);
  const [visible, setVisible] = React.useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialIssueId,
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return state.issues
      .filter((issue) => {
        if (severity !== ALL && issue.severity !== severity) return false;
        if (category !== ALL && issue.category !== category) return false;
        if (website !== ALL && issue.websiteId !== website) return false;
        if (status !== ALL && issue.status !== status) return false;
        if (q) {
          const site = state.websites.find((w) => w.id === issue.websiteId);
          const haystack = `${issue.title} ${issue.ruleId} ${site?.name ?? ""}`;
          if (!haystack.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort(sortBySeverity);
  }, [state.issues, state.websites, query, severity, category, website, status]);

  // Resolve the drawer's issue from the store so status edits stay in sync.
  const selectedIssue = selectedId
    ? (state.issues.find((i) => i.id === selectedId) ?? null)
    : null;

  const open = state.issues.filter(isActive);
  const critical = open.filter((i) => i.severity === "critical").length;
  const resolved = state.issues.filter((i) => i.status === "resolved").length;
  const potentialGain = open.reduce((sum, issue) => sum + issue.scoreImpact, 0);

  const filtersActive =
    query.trim() !== "" ||
    severity !== ALL ||
    category !== ALL ||
    website !== ALL ||
    status !== ALL;

  function clearFilters() {
    setQuery("");
    setSeverity(ALL);
    setCategory(ALL);
    setWebsite(ALL);
    setStatus(ALL);
    setVisible(PAGE_SIZE);
  }

  async function handleStatusChange(issue: Issue, next: IssueStatus) {
    if (issue.status === next) return;

    const result = await setIssueStatus(issue.id, next);

    toast(
      result.ok
        ? {
            tone: next === "resolved" ? "success" : "info",
            title: `Marked as ${STATUS_LABELS[next]}`,
            description: issue.title,
          }
        : {
            tone: "warning",
            title: "Couldn't update that issue",
            description: result.error,
          },
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Issues"
        description="Every finding raised by an audit, ranked by severity. Update status as your team works through them — changes are saved locally."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Open issues" value={open.length} icon={Bug} />
        <StatTile
          label="Critical"
          value={critical}
          valueClassName={critical > 0 ? "text-danger" : "text-success"}
          footer={
            <span className="text-subtle-foreground">
              {critical === 0 ? "Nothing urgent" : "Fix these first"}
            </span>
          }
        />
        <StatTile
          label="Resolved"
          value={resolved}
          icon={ShieldCheck}
          valueClassName="text-success"
        />
        <StatTile
          label="Potential score gain"
          value={`+${potentialGain}`}
          valueClassName="text-accent"
          footer={
            <span className="text-subtle-foreground">
              Estimated points across all open findings
            </span>
          }
        />
      </section>

      <FilterBar
        active={filtersActive}
        onClear={clearFilters}
        resultLabel={`${filtered.length} of ${state.issues.length}`}
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by title, rule ID or website"
          className="w-full sm:w-72"
        />
        <FilterSelect
          label="Severity"
          value={severity}
          onChange={setSeverity}
          allLabel="All severities"
          options={SEVERITIES.map((value) => ({
            value,
            label: SEVERITY_LABELS[value],
          }))}
        />
        <FilterSelect
          label="Category"
          value={category}
          onChange={setCategory}
          allLabel="All categories"
          options={ISSUE_CATEGORIES.map((value) => ({
            value,
            label: CATEGORY_LABELS[value],
          }))}
        />
        <FilterSelect
          label="Website"
          value={website}
          onChange={setWebsite}
          allLabel="All websites"
          options={state.websites.map((w) => ({ value: w.id, label: w.name }))}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          allLabel="All statuses"
          options={ISSUE_STATUSES.map((value) => ({
            value,
            label: STATUS_LABELS[value],
          }))}
        />
      </FilterBar>

      {state.issues.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="No issues on record"
            description="Findings appear here after an audit runs. A clean slate is a good sign."
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="No issues match these filters"
            description="Try a broader severity or category, or clear the filters to see everything."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <>
            <div className="md:hidden">
              <IssueCards
                issues={filtered.slice(0, visible)}
                websites={state.websites}
                onSelect={(issue) => setSelectedId(issue.id)}
                onStatusChange={handleStatusChange}
              />
            </div>
            <Card className="hidden overflow-hidden md:block">
              <IssueTable
                issues={filtered.slice(0, visible)}
                websites={state.websites}
                onSelect={(issue) => setSelectedId(issue.id)}
                onStatusChange={handleStatusChange}
              />
            </Card>
          </>

          {visible < filtered.length ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Load {Math.min(PAGE_SIZE, filtered.length - visible)} more
              </Button>
            </div>
          ) : null}
        </>
      )}

      <IssueDetailSheet
        issue={selectedIssue}
        onOpenChange={(next) => {
          if (!next) setSelectedId(null);
        }}
      />
    </div>
  );
}

/**
 * `?website=` pre-applies a filter and `?issue=` opens that finding's drawer —
 * both arrive from links elsewhere in the app. Keying on them remounts the view
 * with the right starting state rather than syncing params in an effect.
 */
function IssuesRoute() {
  const searchParams = useSearchParams();
  const websiteParam = searchParams.get("website") ?? ALL;
  const issueParam = searchParams.get("issue");

  return (
    <IssuesView
      key={`${websiteParam}:${issueParam ?? ""}`}
      initialWebsite={websiteParam}
      initialIssueId={issueParam}
    />
  );
}

export default function IssuesPage() {
  return (
    <React.Suspense fallback={<SkeletonTable rows={8} />}>
      <IssuesRoute />
    </React.Suspense>
  );
}
