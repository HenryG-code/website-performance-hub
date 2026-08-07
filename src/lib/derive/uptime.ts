import { clamp, createRng, hashSeed } from "@/lib/mock/random";
import type { UptimeDay, Website } from "@/types";

const DAY_MS = 86_400_000;
const UPTIME_DAYS = 30;

/**
 * Simulated availability history.
 *
 * There is no uptime prober in this phase, so there is no honest uptime data to
 * store — inventing rows in the database would dress up fiction as fact. The
 * series is instead derived deterministically from the website's id, so it is
 * stable across reloads and devices without pretending to be measured.
 *
 * When real monitoring lands, this module is replaced by an `uptime_checks`
 * table and the call sites keep the same shape.
 */
export function uptimeForWebsite(website: Website, today: Date): UptimeDay[] {
  // A website with no completed audit has nothing to report on yet.
  if (!website.lastAuditAt) return [];

  const rng = createRng(hashSeed(`uptime:${website.id}`));
  const baseResponse = website.avgResponseMs || 320;

  // Sites flagged degraded carry a visibly worse budget than healthy ones.
  const monthlyLoss =
    website.status === "down"
      ? rng.float(3, 8)
      : website.status === "degraded"
        ? rng.float(0.4, 1.6)
        : rng.float(0, 0.12);

  let remaining = monthlyLoss * UPTIME_DAYS;
  const days: UptimeDay[] = [];

  for (let i = UPTIME_DAYS - 1; i >= 0; i--) {
    const incidentDay = remaining > 0.05 && rng.chance(0.18);
    const loss = incidentDay
      ? Math.min(remaining, rng.float(0.2, Math.max(0.25, remaining * 0.6)))
      : 0;
    remaining -= loss;

    days.push({
      date: new Date(today.getTime() - i * DAY_MS).toISOString().slice(0, 10),
      uptime: Math.round(clamp(100 - loss, 0, 100) * 100) / 100,
      avgResponseMs: Math.round(baseResponse * rng.float(0.82, 1.24)),
      incidents: loss > 0 ? rng.int(1, 2) : 0,
    });
  }

  return days;
}

/** Rolling 30-day availability percentage for a website. */
export function uptimePercent(days: UptimeDay[]): number {
  if (days.length === 0) return 100;
  const total = days.reduce((sum, day) => sum + day.uptime, 0);
  return Math.round((total / days.length) * 100) / 100;
}

/** Deterministic mean origin response time, in milliseconds. */
export function responseTimeFor(websiteId: string, performance: number): number {
  const rng = createRng(hashSeed(`response:${websiteId}`));
  return Math.round(180 + (100 - performance) * 6.5 + rng.float(0, 90));
}
