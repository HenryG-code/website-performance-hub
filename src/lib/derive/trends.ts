import { healthScore } from "@/lib/scores";
import type { Audit, TrendPoint } from "@/types";

/**
 * Builds a score history from real audit runs.
 *
 * Phase 1 generated 90 synthetic daily points. Now the series reflects what
 * actually happened: one point per day on which a run completed, averaged when
 * several ran that day. The chart is therefore sparse for a new account and
 * fills in as audits accumulate — which is the honest picture.
 */
export function trendFromAudits(audits: Audit[]): TrendPoint[] {
  const byDay = new Map<
    string,
    {
      performance: number;
      seo: number;
      accessibility: number;
      bestPractices: number;
      count: number;
    }
  >();

  for (const audit of audits) {
    if (audit.status !== "completed") continue;

    const date = audit.startedAt.slice(0, 10);
    const bucket = byDay.get(date) ?? {
      performance: 0,
      seo: 0,
      accessibility: 0,
      bestPractices: 0,
      count: 0,
    };

    bucket.performance += audit.scores.performance;
    bucket.seo += audit.scores.seo;
    bucket.accessibility += audit.scores.accessibility;
    bucket.bestPractices += audit.scores.bestPractices;
    bucket.count += 1;
    byDay.set(date, bucket);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, bucket]) => {
      const scores = {
        performance: Math.round(bucket.performance / bucket.count),
        seo: Math.round(bucket.seo / bucket.count),
        accessibility: Math.round(bucket.accessibility / bucket.count),
        bestPractices: Math.round(bucket.bestPractices / bucket.count),
      };
      return { date, ...scores, health: healthScore(scores) };
    });
}

/** Per-website trend map, in the shape the store and selectors expect. */
export function trendsByWebsite(
  websiteIds: string[],
  audits: Audit[],
): Record<string, TrendPoint[]> {
  const grouped: Record<string, Audit[]> = {};
  for (const id of websiteIds) grouped[id] = [];
  for (const audit of audits) grouped[audit.websiteId]?.push(audit);

  return Object.fromEntries(
    websiteIds.map((id) => [id, trendFromAudits(grouped[id] ?? [])]),
  );
}
