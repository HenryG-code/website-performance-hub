/**
 * Domain types for PerformanceHub.
 *
 * Phase 1 is mock-data only, but these shapes are intentionally close to what a
 * real Lighthouse / CrUX / uptime-monitor integration would return so the
 * persistence layer can be swapped for an API client without touching the UI.
 */

/** The four Lighthouse-style score categories surfaced across the product. */
export type ScoreKey = "performance" | "seo" | "accessibility" | "bestPractices";

export type Scores = Record<ScoreKey, number>;

/** Coarse health banding derived from a 0-100 score. */
export type ScoreBand = "good" | "fair" | "poor";

export type WebsiteStatus = "operational" | "degraded" | "down" | "paused";

export type Environment = "production" | "staging";

export interface Website {
  id: string;
  name: string;
  url: string;
  /** Short label used for the letter-mark avatar. */
  initials: string;
  environment: Environment;
  team: string;
  tags: string[];
  status: WebsiteStatus;
  scores: Scores;
  /** Weighted 0-100 roll-up of `scores`. */
  healthScore: number;
  /** Percentage uptime over the trailing 30 days. */
  uptime30d: number;
  avgResponseMs: number;
  lastAuditAt: string;
  monitoringSince: string;
}

export type AuditStatus = "completed" | "running" | "failed" | "queued";

export type AuditTrigger = "scheduled" | "manual";

export type Device = "desktop" | "mobile";

/** Core Web Vitals plus the lab metrics a Lighthouse run reports. */
export interface WebVitals {
  /** Largest Contentful Paint, seconds. */
  lcp: number;
  /** Cumulative Layout Shift, unitless. */
  cls: number;
  /** Interaction to Next Paint, milliseconds. */
  inp: number;
  /** Time to First Byte, milliseconds. */
  ttfb: number;
  /** First Contentful Paint, seconds. */
  fcp: number;
  /** Total Blocking Time, milliseconds. */
  tbt: number;
  /** Speed Index, seconds. */
  speedIndex: number;
}

export interface Audit {
  id: string;
  websiteId: string;
  status: AuditStatus;
  trigger: AuditTrigger;
  device: Device;
  startedAt: string;
  /** Wall-clock duration of the run in milliseconds. */
  durationMs: number;
  scores: Scores;
  healthScore: number;
  vitals: WebVitals;
  /** Number of issues opened by this run. */
  issuesFound: number;
  /** Checks that passed, used for the "N audits passed" summary. */
  passedChecks: number;
  totalChecks: number;
  /** Populated when `status === "failed"`. */
  failureReason?: string;
}

export type Severity = "critical" | "high" | "medium" | "low";

export type IssueStatus = "open" | "in_progress" | "resolved" | "ignored";

export type IssueCategory =
  | "performance"
  | "seo"
  | "accessibility"
  | "best-practices"
  | "security";

export type Effort = "low" | "medium" | "high";

export interface Issue {
  id: string;
  websiteId: string;
  auditId: string;
  title: string;
  description: string;
  recommendation: string;
  severity: Severity;
  category: IssueCategory;
  status: IssueStatus;
  foundAt: string;
  updatedAt: string;
  /** Estimated score points recovered by fixing this. */
  scoreImpact: number;
  effort: Effort;
  affectedPages: string[];
  /** Reference to the underlying audit rule, e.g. `render-blocking-resources`. */
  ruleId: string;
}

export interface TrendPoint {
  /** ISO date (no time component) for the bucket. */
  date: string;
  performance: number;
  seo: number;
  accessibility: number;
  bestPractices: number;
  health: number;
}

export interface UptimeDay {
  date: string;
  /** Percentage of the day the site responded successfully. */
  uptime: number;
  avgResponseMs: number;
  incidents: number;
}

export interface NotificationPreferences {
  auditCompleted: boolean;
  criticalIssues: boolean;
  uptimeIncidents: boolean;
  weeklyDigest: boolean;
  scoreDrops: boolean;
  productUpdates: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  company: string;
  timezone: string;
}

export interface Settings {
  profile: UserProfile;
  notifications: NotificationPreferences;
  /** Default audit cadence, surfaced in Settings. */
  auditFrequency: "hourly" | "daily" | "weekly";
  defaultDevice: Device;
  /** Health score below which a website is flagged. */
  scoreThreshold: number;
}

/**
 * Partial update for settings. `profile` and `notifications` are themselves
 * partial so a single switch can be toggled without resending the whole object.
 */
export interface SettingsPatch
  extends Partial<Omit<Settings, "profile" | "notifications">> {
  profile?: Partial<UserProfile>;
  notifications?: Partial<NotificationPreferences>;
}

/** Serialised shape written to localStorage. */
export interface PersistedState {
  version: number;
  websites: Website[];
  audits: Audit[];
  issues: Issue[];
  trends: Record<string, TrendPoint[]>;
  uptime: Record<string, UptimeDay[]>;
  settings: Settings;
}
