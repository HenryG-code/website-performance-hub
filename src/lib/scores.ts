import { SCORE_WEIGHTS } from "./constants";
import type {
  Issue,
  ScoreBand,
  ScoreKey,
  Scores,
  Severity,
  IssueStatus,
  IssueCategory,
} from "@/types";

export const SCORE_KEYS: ScoreKey[] = [
  "performance",
  "seo",
  "accessibility",
  "bestPractices",
];

export const SCORE_LABELS: Record<ScoreKey, string> = {
  performance: "Performance",
  seo: "SEO",
  accessibility: "Accessibility",
  bestPractices: "Best Practices",
};

/** Weighted roll-up used everywhere a single "health" number is shown. */
export function healthScore(scores: Scores): number {
  const total = SCORE_KEYS.reduce(
    (sum, key) => sum + scores[key] * SCORE_WEIGHTS[key],
    0,
  );
  return Math.round(total);
}

export function scoreBand(score: number): ScoreBand {
  if (score >= 90) return "good";
  if (score >= 60) return "fair";
  return "poor";
}

export const BAND_LABELS: Record<ScoreBand, string> = {
  good: "Good",
  fair: "Needs work",
  poor: "Poor",
};

/** Tailwind text colour token per band. Kept in one place so charts and badges agree. */
export const BAND_TEXT: Record<ScoreBand, string> = {
  good: "text-success",
  fair: "text-warning",
  poor: "text-danger",
};

export const BAND_HEX: Record<ScoreBand, string> = {
  good: "#34d399",
  fair: "#fbbf24",
  poor: "#f87171",
};

/** Stable colours for the multi-series trend chart. */
export const SERIES_HEX: Record<ScoreKey | "health", string> = {
  health: "#38bdf8",
  performance: "#818cf8",
  seo: "#34d399",
  accessibility: "#fbbf24",
  bestPractices: "#f472b6",
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  ignored: "Ignored",
};

export const ISSUE_STATUSES: IssueStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "ignored",
];

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  performance: "Performance",
  seo: "SEO",
  accessibility: "Accessibility",
  "best-practices": "Best Practices",
  security: "Security",
};

export const ISSUE_CATEGORIES: IssueCategory[] = [
  "performance",
  "seo",
  "accessibility",
  "best-practices",
  "security",
];

/** An issue counts against a site until it is resolved or explicitly ignored. */
export function isActive(issue: Issue): boolean {
  return issue.status === "open" || issue.status === "in_progress";
}

export function sortBySeverity(a: Issue, b: Issue): number {
  const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  if (bySeverity !== 0) return bySeverity;
  return new Date(b.foundAt).getTime() - new Date(a.foundAt).getTime();
}

/** Signed delta helper used by trend deltas and report comparisons. */
export function delta(current: number, previous: number): number {
  return Math.round((current - previous) * 10) / 10;
}
