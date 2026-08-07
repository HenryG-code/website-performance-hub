"use client";

import * as React from "react";
import { Globe, LayoutGrid, List, SearchX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ALL,
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/shared/filters";
import { AddWebsiteDialog } from "@/components/websites/add-website-dialog";
import {
  WebsiteCards,
  WebsiteTable,
  type WebsiteRow,
} from "@/components/websites/website-table";
import { useAppStore } from "@/lib/store/app-store";
import { websiteIssueCount } from "@/lib/store/selectors";
import { scoreBand } from "@/lib/scores";

const STATUS_OPTIONS = [
  { value: "operational", label: "Operational" },
  { value: "degraded", label: "Degraded" },
  { value: "down", label: "Down" },
  { value: "paused", label: "Not audited" },
];

const HEALTH_OPTIONS = [
  { value: "good", label: "Good (90+)" },
  { value: "fair", label: "Needs work (60–89)" },
  { value: "poor", label: "Poor (below 60)" },
];

const SORT_OPTIONS = [
  { value: "health-asc", label: "Health: worst first" },
  { value: "health-desc", label: "Health: best first" },
  { value: "issues-desc", label: "Most issues" },
  { value: "recent", label: "Recently audited" },
  { value: "name", label: "Name A–Z" },
];

export default function WebsitesPage() {
  const { state } = useAppStore();

  const [query, setQuery] = React.useState("");
  const [environment, setEnvironment] = React.useState(ALL);
  const [status, setStatus] = React.useState(ALL);
  const [health, setHealth] = React.useState(ALL);
  const [sort, setSort] = React.useState("health-asc");
  const [view, setView] = React.useState<"table" | "cards">("table");

  const rows = React.useMemo<WebsiteRow[]>(() => {
    const q = query.trim().toLowerCase();

    const filtered = state.websites.filter((website) => {
      if (
        q &&
        !(
          website.name.toLowerCase().includes(q) ||
          website.url.toLowerCase().includes(q) ||
          website.team.toLowerCase().includes(q) ||
          website.tags.some((tag) => tag.includes(q))
        )
      ) {
        return false;
      }
      if (environment !== ALL && website.environment !== environment) return false;
      if (status !== ALL && website.status !== status) return false;
      if (health !== ALL) {
        // Sites without results have no band and are excluded from band filters.
        if (!website.lastAuditAt) return false;
        if (scoreBand(website.healthScore) !== health) return false;
      }
      return true;
    });

    const mapped = filtered.map((website) => ({
      website,
      issueCount: websiteIssueCount(state, website.id),
      trend: state.trends[website.id] ?? [],
    }));

    const sorted = [...mapped].sort((a, b) => {
      switch (sort) {
        case "health-desc":
          return b.website.healthScore - a.website.healthScore;
        case "issues-desc":
          return b.issueCount - a.issueCount;
        case "recent":
          return (
            new Date(b.website.lastAuditAt || 0).getTime() -
            new Date(a.website.lastAuditAt || 0).getTime()
          );
        case "name":
          return a.website.name.localeCompare(b.website.name);
        case "health-asc":
        default:
          return a.website.healthScore - b.website.healthScore;
      }
    });

    return sorted;
  }, [state, query, environment, status, health, sort]);

  const filtersActive =
    query.trim() !== "" ||
    environment !== ALL ||
    status !== ALL ||
    health !== ALL;

  function clearFilters() {
    setQuery("");
    setEnvironment(ALL);
    setStatus(ALL);
    setHealth(ALL);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Websites"
        description="Every property you monitor, with its current health score, measured server response and outstanding findings."
        actions={
          <>
            <Tabs value={view} onValueChange={(value) => setView(value as typeof view)}>
              <TabsList>
                <TabsTrigger value="table" aria-label="Table view">
                  <List />
                  Table
                </TabsTrigger>
                <TabsTrigger value="cards" aria-label="Card view">
                  <LayoutGrid />
                  Cards
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <AddWebsiteDialog />
          </>
        }
      />

      <FilterBar
        active={filtersActive}
        onClear={clearFilters}
        resultLabel={`${rows.length} of ${state.websites.length}`}
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by name, URL, team or tag"
          className="w-full sm:w-72"
        />
        <FilterSelect
          label="Environment"
          value={environment}
          onChange={setEnvironment}
          allLabel="All environments"
          options={[
            { value: "production", label: "Production" },
            { value: "staging", label: "Staging" },
          ]}
        />
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          allLabel="All statuses"
          options={STATUS_OPTIONS}
        />
        <FilterSelect
          label="Health band"
          value={health}
          onChange={setHealth}
          allLabel="All health bands"
          options={HEALTH_OPTIONS}
        />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Sort websites">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {state.websites.length === 0 ? (
        <Card>
          <EmptyState
            icon={Globe}
            title="No websites yet"
            description="Add the first site you want to monitor, then run an audit to collect its Lighthouse scores, Core Web Vitals and findings."
            action={<AddWebsiteDialog />}
          />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="No websites match these filters"
            description="Try a different search term, or clear the filters to see the full portfolio."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : view === "table" ? (
        <Card className="overflow-hidden">
          <WebsiteTable rows={rows} />
        </Card>
      ) : (
        <WebsiteCards rows={rows} />
      )}
    </div>
  );
}
