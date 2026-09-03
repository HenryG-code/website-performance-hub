"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Clock3, Gauge, Globe2, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScroller,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { SiteAvatar } from "@/components/shared/site-avatar";
import { UptimeStatusBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { useToast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store/app-store";
import { monitorForWebsite, uptimeWindow } from "@/lib/derive/uptime";
import {
  displayUrl,
  formatDateTime,
  formatDuration,
  formatMs,
  formatRelative,
} from "@/lib/format";

function formatAvailability(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(value === 100 ? 0 : 2)}%`;
}

function outageDuration(detectedAt: string, recoveredAt: string | null): string {
  if (!recoveredAt) return "Ongoing";
  return formatDuration(Math.max(0, new Date(recoveredAt).getTime() - new Date(detectedAt).getTime()));
}

export default function UptimePage() {
  const { state, setUptimeMonitoring } = useAppStore();
  const { toast } = useToast();
  const [pendingIds, setPendingIds] = React.useState<string[]>([]);

  const monitors = state.uptimeMonitors;
  const enabled = monitors.filter((monitor) => monitor.enabled);
  const online = enabled.filter((monitor) => monitor.state === "up").length;
  const offline = enabled.filter((monitor) => monitor.state === "down").length;
  const allThirtyDay = enabled.reduce(
    (total, monitor) => {
      const window = uptimeWindow(state.uptimeDaily, monitor.id, 30);
      return {
        checks: total.checks + window.checks,
        successes: total.successes + window.successes,
      };
    },
    { checks: 0, successes: 0 },
  );
  const portfolioAvailability = allThirtyDay.checks
    ? (allThirtyDay.successes / allThirtyDay.checks) * 100
    : null;
  const recentIncidents = [...state.uptimeIncidents]
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
    .slice(0, 8)
    .map((incident) => ({
      incident,
      monitor: monitors.find((monitor) => monitor.id === incident.monitorId),
    }));

  async function toggle(websiteId: string, active: boolean) {
    setPendingIds((ids) => [...ids, websiteId]);
    try {
      const result = await setUptimeMonitoring(websiteId, active);
      if (!result.ok) {
        toast({ tone: "warning", title: "Couldn't update monitor", description: result.error });
        return;
      }
      toast({
        tone: "success",
        title: active ? "Uptime monitoring enabled" : "Uptime monitoring paused",
        description: active
          ? "The first check will run in the next hourly sweep."
          : "No further checks will be scheduled for this website.",
      });
    } finally {
      setPendingIds((ids) => ids.filter((id) => id !== websiteId));
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Uptime monitoring"
        description="Hourly reachability checks from one probe region. A site is confirmed offline after two consecutive failed checks."
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Uptime summary">
        <StatTile
          label="Active monitors"
          value={enabled.length}
          icon={Activity}
          footer={<span className="text-subtle-foreground">of {state.websites.length} websites</span>}
        />
        <StatTile
          label="Online now"
          value={online}
          icon={Globe2}
          iconClassName="text-success"
          footer={<span className="text-subtle-foreground">latest completed check</span>}
        />
        <StatTile
          label="Confirmed offline"
          value={offline}
          icon={ShieldAlert}
          iconClassName={offline ? "text-danger" : "text-subtle-foreground"}
          footer={<span className="text-subtle-foreground">two failed checks required</span>}
        />
        <StatTile
          label="30-day availability"
          value={formatAvailability(portfolioAvailability)}
          icon={Gauge}
          footer={<span className="text-subtle-foreground">{allThirtyDay.checks} checks recorded</span>}
        />
      </section>

      {state.websites.length === 0 ? (
        <Card>
          <EmptyState
            icon={Globe2}
            title="No websites to monitor"
            description="Add a website first, then enable uptime monitoring for the properties that matter most."
          />
        </Card>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {state.websites.map((website) => {
              const monitor = monitorForWebsite(monitors, website.id);
              const window = uptimeWindow(state.uptimeDaily, monitor?.id, 30);
              const pending = pendingIds.includes(website.id);
              const stateValue = monitor?.state ?? "paused";

              return (
                <Card key={website.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/websites/${website.id}`} className="flex min-w-0 items-center gap-3">
                      <SiteAvatar name={website.name} initials={website.initials} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{website.name}</span>
                        <span className="block truncate text-xs text-subtle-foreground">{displayUrl(website.url)}</span>
                      </span>
                    </Link>
                    <Switch
                      checked={monitor?.enabled ?? false}
                      disabled={pending}
                      onCheckedChange={(active) => void toggle(website.id, active)}
                      aria-label={`${monitor?.enabled ? "Pause" : "Enable"} uptime monitoring for ${website.name}`}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <UptimeStatusBadge status={stateValue} size="sm" />
                    <span className="text-xs text-subtle-foreground">
                      {monitor?.lastCheckedAt ? formatRelative(monitor.lastCheckedAt) : "Not checked"}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div><dt className="text-subtle-foreground">Uptime</dt><dd className="mt-1 font-mono text-foreground">{formatAvailability(window.availability)}</dd></div>
                    <div><dt className="text-subtle-foreground">Response</dt><dd className="mt-1 font-mono text-foreground">{formatMs(monitor?.lastResponseMs)}</dd></div>
                    <div><dt className="text-subtle-foreground">Status</dt><dd className="mt-1 font-mono text-foreground">{monitor?.lastStatusCode ?? "—"}</dd></div>
                  </dl>
                </Card>
              );
            })}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <TableScroller>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Website</TableHead>
                  <TableHead className="w-28">Monitor</TableHead>
                  <TableHead className="w-40">Current state</TableHead>
                  <TableHead className="w-32">30-day uptime</TableHead>
                  <TableHead className="w-32">Response</TableHead>
                  <TableHead className="w-36">Last check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.websites.map((website) => {
                  const monitor = monitorForWebsite(monitors, website.id);
                  const window = uptimeWindow(state.uptimeDaily, monitor?.id, 30);
                  const pending = pendingIds.includes(website.id);
                  const stateValue = monitor?.state ?? "paused";

                  return (
                    <TableRow key={website.id}>
                      <TableCell>
                        <Link href={`/websites/${website.id}`} className="flex items-center gap-3">
                          <SiteAvatar name={website.name} initials={website.initials} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {website.name}
                            </span>
                            <span className="block truncate text-xs text-subtle-foreground">
                              {displayUrl(website.url)}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={monitor?.enabled ?? false}
                          disabled={pending}
                          onCheckedChange={(active) => void toggle(website.id, active)}
                          aria-label={`${monitor?.enabled ? "Pause" : "Enable"} uptime monitoring for ${website.name}`}
                        />
                      </TableCell>
                      <TableCell><UptimeStatusBadge status={stateValue} size="sm" /></TableCell>
                      <TableCell>
                        <span className="font-mono text-sm tabular-nums text-foreground">
                          {formatAvailability(window.availability)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm tabular-nums text-foreground">
                          {monitor?.lastResponseMs === null || monitor?.lastResponseMs === undefined
                            ? "—"
                            : formatMs(monitor.lastResponseMs)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="size-3.5" />
                          {monitor?.lastCheckedAt ? formatRelative(monitor.lastCheckedAt) : "Not checked"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </TableScroller>
          </Card>
        </>
      )}

      <section aria-labelledby="outage-history" className="space-y-3">
        <div>
          <h2 id="outage-history" className="text-base font-semibold text-foreground">Outage history</h2>
          <p className="mt-1 text-xs text-subtle-foreground">
            Times are UTC. An outage begins after two failed hourly checks and ends on the next successful check.
          </p>
        </div>
        {recentIncidents.length === 0 ? (
          <Card className="p-4 text-sm text-subtle-foreground">No confirmed outages have been recorded.</Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recentIncidents.map(({ incident, monitor }) => {
              const website = state.websites.find((site) => site.id === monitor?.websiteId);
              return (
                <Card key={incident.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{website?.name ?? "Removed website"}</p>
                      <p className="mt-1 text-xs text-subtle-foreground">
                        {formatDateTime(incident.detectedAt)}
                        {incident.recoveredAt ? ` → ${formatDateTime(incident.recoveredAt)}` : " → still offline"}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-danger">{outageDuration(incident.detectedAt, incident.recoveredAt)}</span>
                  </div>
                  <p className="mt-3 truncate border-t border-border pt-3 text-xs text-subtle-foreground">{incident.initialError}</p>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs text-subtle-foreground">
        Availability is calculated from completed checks, not inferred from PageSpeed audits. Outage duration is estimated between checks.
      </p>
    </div>
  );
}
