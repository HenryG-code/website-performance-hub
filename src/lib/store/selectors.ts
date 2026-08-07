import { healthScore, isActive, sortBySeverity } from "@/lib/scores";
import type {
  Audit,
  Issue,
  PersistedState,
  ScoreKey,
  Scores,
  TrendPoint,
  UptimeDay,
  Website,
} from "@/types";

const SCORE_KEYS: ScoreKey[] = [
  "performance",
  "seo",
  "accessibility",
  "bestPractices",
];

export function getWebsite(
  state: PersistedState,
  id: string,
): Website | undefined {
  return state.websites.find((w) => w.id === id);
}

export function auditsForWebsite(state: PersistedState, id: string): Audit[] {
  return state.audits.filter((a) => a.websiteId === id);
}

export function issuesForWebsite(state: PersistedState, id: string): Issue[] {
  return state.issues.filter((i) => i.websiteId === id);
}

export function activeIssues(issues: Issue[]): Issue[] {
  return issues.filter(isActive);
}

export function websiteIssueCount(state: PersistedState, id: string): number {
  return state.issues.filter((i) => i.websiteId === id && isActive(i)).length;
}

export function trendFor(state: PersistedState, id: string): TrendPoint[] {
  return state.trends[id] ?? [];
}

export function uptimeFor(state: PersistedState, id: string): UptimeDay[] {
  return state.uptime[id] ?? [];
}

export function websiteName(state: PersistedState, id: string): string {
  return getWebsite(state, id)?.name ?? "Unknown website";
}

export interface PortfolioSummary {
  health: number;
  scores: Scores;
  uptime: number;
  websiteCount: number;
  monitoredCount: number;
  auditCount: number;
  openIssues: number;
  criticalIssues: number;
  /** Health-score change over the trailing 30 days, in points. */
  healthDelta: number;
  uptimeIncidents: number;
}

/** Only sites with at least one completed audit contribute to averages. */
function scoredWebsites(websites: Website[]): Website[] {
  return websites.filter((w) => w.lastAuditAt !== "");
}

export function portfolioSummary(
  state: PersistedState,
  websiteIds?: string[],
): PortfolioSummary {
  const websites = websiteIds
    ? state.websites.filter((w) => websiteIds.includes(w.id))
    : state.websites;

  const scored = scoredWebsites(websites);
  const ids = new Set(websites.map((w) => w.id));

  const scores = {} as Scores;
  for (const key of SCORE_KEYS) {
    scores[key] = scored.length
      ? Math.round(
          scored.reduce((sum, w) => sum + w.scores[key], 0) / scored.length,
        )
      : 0;
  }

  const uptime = scored.length
    ? scored.reduce((sum, w) => sum + w.uptime30d, 0) / scored.length
    : 100;

  const issues = state.issues.filter((i) => ids.has(i.websiteId));
  const trend = aggregateTrend(state, websites.map((w) => w.id));
  const health = scored.length ? healthScore(scores) : 0;

  const thirtyDaysBack = trend[Math.max(0, trend.length - 31)];
  const healthDelta =
    trend.length > 1 && thirtyDaysBack
      ? health - thirtyDaysBack.health
      : 0;

  const incidents = websites.reduce(
    (sum, w) =>
      sum +
      (state.uptime[w.id] ?? []).reduce((s, day) => s + day.incidents, 0),
    0,
  );

  return {
    health,
    scores,
    uptime: Math.round(uptime * 100) / 100,
    websiteCount: websites.length,
    monitoredCount: scored.length,
    auditCount: state.audits.filter((a) => ids.has(a.websiteId)).length,
    openIssues: issues.filter(isActive).length,
    criticalIssues: issues.filter((i) => isActive(i) && i.severity === "critical")
      .length,
    healthDelta,
    uptimeIncidents: incidents,
  };
}

/**
 * Averages the per-site trend series into one portfolio series, aligned by date.
 * Sites without history for a given day simply do not contribute to it.
 */
export function aggregateTrend(
  state: PersistedState,
  websiteIds: string[],
): TrendPoint[] {
  const buckets = new Map<string, { sums: TrendPoint; count: number }>();

  for (const id of websiteIds) {
    for (const point of state.trends[id] ?? []) {
      const existing = buckets.get(point.date);
      if (!existing) {
        buckets.set(point.date, { sums: { ...point }, count: 1 });
        continue;
      }
      existing.sums.performance += point.performance;
      existing.sums.seo += point.seo;
      existing.sums.accessibility += point.accessibility;
      existing.sums.bestPractices += point.bestPractices;
      existing.sums.health += point.health;
      existing.count += 1;
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, { sums, count }]) => ({
      date,
      performance: Math.round(sums.performance / count),
      seo: Math.round(sums.seo / count),
      accessibility: Math.round(sums.accessibility / count),
      bestPractices: Math.round(sums.bestPractices / count),
      health: Math.round(sums.health / count),
    }));
}

/** Trailing slice of a trend series, e.g. the last 30 days. */
export function lastDays(trend: TrendPoint[], days: number): TrendPoint[] {
  return trend.slice(Math.max(0, trend.length - days));
}

export function recentAudits(
  state: PersistedState,
  limit: number,
  websiteIds?: string[],
): Audit[] {
  const filtered = websiteIds
    ? state.audits.filter((a) => websiteIds.includes(a.websiteId))
    : state.audits;
  return filtered.slice(0, limit);
}

export function priorityIssues(
  state: PersistedState,
  limit: number,
  websiteIds?: string[],
): Issue[] {
  const filtered = websiteIds
    ? state.issues.filter((i) => websiteIds.includes(i.websiteId))
    : state.issues;
  return filtered.filter(isActive).sort(sortBySeverity).slice(0, limit);
}

export interface CategoryBreakdown {
  key: ScoreKey;
  score: number;
  /** Change vs. the same category 30 days ago. */
  delta: number;
  openIssues: number;
}

export function categoryBreakdown(
  scores: Scores,
  trend: TrendPoint[],
  issues: Issue[],
): CategoryBreakdown[] {
  const past = trend[Math.max(0, trend.length - 31)];
  const active = activeIssues(issues);

  return SCORE_KEYS.map((key) => ({
    key,
    score: scores[key],
    delta: past ? scores[key] - past[key] : 0,
    openIssues: active.filter(
      (i) => i.category === (key === "bestPractices" ? "best-practices" : key),
    ).length,
  }));
}
