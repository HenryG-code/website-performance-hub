import { healthScore, isActive, sortBySeverity } from "@/lib/scores";
import type {
  Audit,
  Issue,
  AppState,
  ScoreKey,
  Scores,
  TrendPoint,
  Website,
} from "@/types";

const SCORE_KEYS: ScoreKey[] = [
  "performance",
  "seo",
  "accessibility",
  "bestPractices",
];

export function getWebsite(
  state: AppState,
  id: string,
): Website | undefined {
  return state.websites.find((w) => w.id === id);
}

export function auditsForWebsite(state: AppState, id: string): Audit[] {
  return state.audits.filter((a) => a.websiteId === id);
}

export function issuesForWebsite(state: AppState, id: string): Issue[] {
  return state.issues.filter((i) => i.websiteId === id);
}

export function activeIssues(issues: Issue[]): Issue[] {
  return issues.filter(isActive);
}

export function websiteIssueCount(state: AppState, id: string): number {
  return state.issues.filter((i) => i.websiteId === id && isActive(i)).length;
}

export function trendFor(state: AppState, id: string): TrendPoint[] {
  return state.trends[id] ?? [];
}


export function websiteName(state: AppState, id: string): string {
  return getWebsite(state, id)?.name ?? "Unknown website";
}

export interface PortfolioSummary {
  health: number;
  scores: Scores;
  websiteCount: number;
  /** Sites with at least one completed audit. */
  monitoredCount: number;
  auditCount: number;
  openIssues: number;
  criticalIssues: number;
  /** Health-score change over the trailing 30 days, in points. */
  healthDelta: number;
  /** Sites whose most recent run failed. */
  failedCount: number;
  /** Mean measured server response time, in ms. Null when none reported. */
  medianTtfbMs: number | null;
  /** Sites for which Google reported real-user field data. */
  fieldDataCount: number;
}

/** Only sites with at least one completed audit contribute to averages. */
function scoredWebsites(websites: Website[]): Website[] {
  return websites.filter((w) => w.lastAuditAt !== "");
}

export function portfolioSummary(
  state: AppState,
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

  const issues = state.issues.filter((i) => ids.has(i.websiteId));
  const trend = aggregateTrend(state, websites.map((w) => w.id));
  const health = scored.length ? healthScore(scores) : 0;

  const thirtyDaysBack = baselinePoint(trend, 30);
  const healthDelta = thirtyDaysBack ? health - thirtyDaysBack.health : 0;

  // Median rather than mean: one pathologically slow origin should not drag the
  // portfolio figure somewhere unrepresentative.
  const ttfbs = scored
    .map((w) => w.ttfbMs)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
  const medianTtfbMs = ttfbs.length
    ? ttfbs[Math.floor((ttfbs.length - 1) / 2)]
    : null;

  return {
    health,
    scores,
    websiteCount: websites.length,
    monitoredCount: scored.length,
    auditCount: state.audits.filter((a) => ids.has(a.websiteId)).length,
    openIssues: issues.filter(isActive).length,
    criticalIssues: issues.filter((i) => isActive(i) && i.severity === "critical")
      .length,
    healthDelta,
    failedCount: websites.filter((w) => w.lastFailure !== null).length,
    medianTtfbMs,
    fieldDataCount: websites.filter((w) => w.field !== null).length,
  };
}

/**
 * Averages the per-site trend series into one portfolio series, aligned by date.
 * Sites without history for a given day simply do not contribute to it.
 */
export function aggregateTrend(
  state: AppState,
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

const DAY_MS = 86_400_000;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Trailing window of a trend series.
 *
 * Filters by date rather than by element count: the series now has one point
 * per day on which an audit ran, so a site audited weekly has ~4 points in a
 * 30-day window and slicing the last 30 entries would reach back months.
 */
export function lastDays(trend: TrendPoint[], days: number): TrendPoint[] {
  const cutoff = isoDaysAgo(days);
  return trend.filter((point) => point.date >= cutoff);
}

/**
 * The trend point to compare "today" against for an N-day delta: the most
 * recent point at or before the cutoff, or the oldest point available when the
 * history is shorter than the window.
 */
export function baselinePoint(
  trend: TrendPoint[],
  days: number,
): TrendPoint | undefined {
  if (trend.length === 0) return undefined;

  const cutoff = isoDaysAgo(days);
  const atOrBefore = trend.filter((point) => point.date <= cutoff);

  // No point that old means the account has less than `days` of history; the
  // caller decides whether a partial-window comparison is meaningful.
  return atOrBefore.length > 0 ? atOrBefore[atOrBefore.length - 1] : undefined;
}

export function recentAudits(
  state: AppState,
  limit: number,
  websiteIds?: string[],
): Audit[] {
  const filtered = websiteIds
    ? state.audits.filter((a) => websiteIds.includes(a.websiteId))
    : state.audits;
  return filtered.slice(0, limit);
}

export function priorityIssues(
  state: AppState,
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
  const past = baselinePoint(trend, 30);
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

