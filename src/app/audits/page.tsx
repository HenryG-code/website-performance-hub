"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, SearchX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SkeletonTable } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatTile } from "@/components/shared/stat-tile";
import {
  ALL,
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/shared/filters";
import { AuditTable } from "@/components/audits/audit-table";
import { RunAuditButton } from "@/components/dashboard/run-audit-button";
import { useAppStore } from "@/lib/store/app-store";
import { formatDuration } from "@/lib/format";

const STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "running", label: "Running" },
  { value: "queued", label: "Queued" },
  { value: "failed", label: "Failed" },
];

const DEVICE_OPTIONS = [
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
];

const PAGE_SIZE = 20;

function AuditsView({ initialWebsite }: { initialWebsite: string }) {
  const { state } = useAppStore();

  const [query, setQuery] = React.useState("");
  const [website, setWebsite] = React.useState(initialWebsite);
  const [status, setStatus] = React.useState(ALL);
  const [device, setDevice] = React.useState(ALL);
  const [visible, setVisible] = React.useState(PAGE_SIZE);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    return state.audits.filter((audit) => {
      if (website !== ALL && audit.websiteId !== website) return false;
      if (status !== ALL && audit.status !== status) return false;
      if (device !== ALL && audit.device !== device) return false;
      if (q) {
        const site = state.websites.find((w) => w.id === audit.websiteId);
        const haystack = `${audit.id} ${site?.name ?? ""} ${site?.url ?? ""}`;
        if (!haystack.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [state.audits, state.websites, query, website, status, device]);

  const completed = filtered.filter((a) => a.status === "completed");
  const avgScore = completed.length
    ? Math.round(
        completed.reduce((sum, a) => sum + a.healthScore, 0) / completed.length,
      )
    : 0;
  const avgDuration = completed.length
    ? Math.round(
        completed.reduce((sum, a) => sum + a.durationMs, 0) / completed.length,
      )
    : 0;
  const failed = filtered.filter((a) => a.status === "failed").length;

  const filtersActive =
    query.trim() !== "" || website !== ALL || status !== ALL || device !== ALL;

  function clearFilters() {
    setQuery("");
    setWebsite(ALL);
    setStatus(ALL);
    setDevice(ALL);
    setVisible(PAGE_SIZE);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audits"
        description="Every audit run across your portfolio, including scheduled sweeps and the ones you triggered by hand."
        actions={
          <RunAuditButton
            websiteIds={
              website === ALL
                ? state.websites.map((w) => w.id)
                : [website]
            }
          />
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Runs in view" value={filtered.length} icon={BarChart3} />
        <StatTile
          label="Average health"
          value={completed.length ? avgScore : "—"}
          footer={
            <span className="text-subtle-foreground">
              {completed.length} completed run{completed.length === 1 ? "" : "s"}
            </span>
          }
        />
        <StatTile
          label="Average duration"
          value={completed.length ? formatDuration(avgDuration) : "—"}
        />
        <StatTile
          label="Failed runs"
          value={failed}
          valueClassName={failed > 0 ? "text-danger" : undefined}
          footer={
            <span className="text-subtle-foreground">
              {failed === 0 ? "All runs succeeded" : "Check the failure reason"}
            </span>
          }
        />
      </section>

      <FilterBar
        active={filtersActive}
        onClear={clearFilters}
        resultLabel={`${filtered.length} of ${state.audits.length}`}
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by website or audit ID"
          className="w-full sm:w-72"
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
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="Device"
          value={device}
          onChange={setDevice}
          allLabel="All devices"
          options={DEVICE_OPTIONS}
        />
      </FilterBar>

      {state.audits.length === 0 ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No audits recorded"
            description="Run an audit from the dashboard or a website page to capture your first set of scores."
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="No audits match these filters"
            description="Try widening the date range, choosing a different website, or clearing the filters."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <AuditTable
              audits={filtered.slice(0, visible)}
              websites={state.websites}
            />
          </Card>

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
    </div>
  );
}

/**
 * Arriving from a "view all audits for this site" link should start the page
 * with that filter applied. Keying the view on the param remounts it with fresh
 * state instead of syncing a copy of the param in an effect.
 */
function AuditsRoute() {
  const websiteParam = useSearchParams().get("website") ?? ALL;
  return <AuditsView key={websiteParam} initialWebsite={websiteParam} />;
}

export default function AuditsPage() {
  return (
    <React.Suspense fallback={<SkeletonTable rows={8} />}>
      <AuditsRoute />
    </React.Suspense>
  );
}
