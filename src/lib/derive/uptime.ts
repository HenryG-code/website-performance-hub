import type { UptimeDaily, UptimeMonitor } from "@/types";

const DAY_MS = 86_400_000;

export interface UptimeWindow {
  checks: number;
  successes: number;
  availability: number | null;
  averageResponseMs: number | null;
}

/** Aggregates compact daily rows into an honest check-based availability rate. */
export function uptimeWindow(
  daily: UptimeDaily[],
  monitorId: string | undefined,
  days: number,
): UptimeWindow {
  if (!monitorId) {
    return { checks: 0, successes: 0, availability: null, averageResponseMs: null };
  }

  const cutoff = new Date(Date.now() - (days - 1) * DAY_MS)
    .toISOString()
    .slice(0, 10);
  const rows = daily.filter((row) => row.monitorId === monitorId && row.day >= cutoff);
  const checks = rows.reduce((total, row) => total + row.checkCount, 0);
  const successes = rows.reduce((total, row) => total + row.successCount, 0);
  const responseSamples = rows.reduce(
    (total, row) => total + row.responseSampleCount,
    0,
  );
  const responseTotal = rows.reduce((total, row) => total + row.responseTotalMs, 0);

  return {
    checks,
    successes,
    availability: checks ? (successes / checks) * 100 : null,
    averageResponseMs: responseSamples ? Math.round(responseTotal / responseSamples) : null,
  };
}

export function monitorForWebsite(
  monitors: UptimeMonitor[],
  websiteId: string,
): UptimeMonitor | undefined {
  return monitors.find((monitor) => monitor.websiteId === websiteId);
}
