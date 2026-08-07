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
  /**
   * Server response time from the latest completed audit's lab metrics, in
   * milliseconds. Null when no audit has completed or Lighthouse omitted it.
   */
  ttfbMs: number | null;
  /** Real-user data from the latest completed audit, if Google reported any. */
  field: FieldVitals | null;
  /** Start time of the most recent completed audit; empty when never audited. */
  lastAuditAt: string;
  /**
   * Set when the most recent run failed. The site keeps showing its last good
   * scores, with this surfaced alongside rather than replacing them.
   */
  lastFailure: { at: string; reason: string; code: string | null } | null;
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

/** Where an audit's numbers came from. */
export type AuditProvider = "pagespeed" | "simulated";

/** Google's bucketing of a real-user metric. */
export type CruxCategory = "FAST" | "AVERAGE" | "SLOW" | "NONE";

/**
 * Real-user (CrUX) Core Web Vitals, in milliseconds except `cls`.
 *
 * Every field is nullable: Google only reports field data for URLs and origins
 * with enough real traffic, and a missing metric must read as "not reported"
 * rather than zero.
 */
export interface FieldVitals {
  scope: "url" | "origin" | null;
  overallCategory: CruxCategory | null;
  lcpMs: number | null;
  inpMs: number | null;
  cls: number | null;
  fcpMs: number | null;
  ttfbMs: number | null;
  /**
   * Google's own good/needs-improvement/poor banding per metric. Only the
   * overall category is stored, so per-metric bands are derived from the
   * published Core Web Vitals thresholds when reading a stored audit.
   */
  categories: {
    lcp: CruxCategory | null;
    inp: CruxCategory | null;
    cls: CruxCategory | null;
    fcp: CruxCategory | null;
    ttfb: CruxCategory | null;
  };
}

export interface Audit {
  id: string;
  websiteId: string;
  status: AuditStatus;
  trigger: AuditTrigger;
  /** PageSpeed strategy: `desktop` or `mobile`. */
  device: Device;
  provider: AuditProvider;
  startedAt: string;
  /** Wall-clock duration of the run in milliseconds. */
  durationMs: number;
  scores: Scores;
  healthScore: number;
  /** Lighthouse lab metrics. Seconds for lcp/fcp/speedIndex, ms for the rest. */
  vitals: WebVitals;
  /**
   * Measured server response time in milliseconds, kept separately from
   * `vitals` because it is surfaced as a headline figure and 0ms is a real
   * result — a well-cached origin genuinely reports it. `vitals.ttfb` collapses
   * "not reported" to 0, which would be indistinguishable.
   */
  labTtfbMs: number | null;
  /** CrUX field data, or null when Google reported none. */
  field: FieldVitals | null;
  /** URL submitted to the provider. */
  requestedUrl: string | null;
  /** Where the provider ended up after redirects. */
  finalUrl: string | null;
  lighthouseVersion: string | null;
  /** When the provider ran the analysis, which is not when we stored it. */
  analysedAt: string | null;
  /** Number of findings opened by this run. */
  issuesFound: number;
  /** Checks that passed, used for the "N checks passed" summary. */
  passedChecks: number;
  totalChecks: number;
  /** Populated when `status === "failed"`. */
  failureReason?: string;
  /** Machine-readable failure cause, e.g. `quota-exceeded`. */
  errorCode?: string;
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

/** Lighthouse splits failing audits into savings-bearing and informational. */
export type FindingKind = "opportunity" | "diagnostic";

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
  kind: FindingKind;
  provider: AuditProvider;
  foundAt: string;
  updatedAt: string;
  /** Score points this category regains if the check passes outright. */
  scoreImpact: number;
  /** Lighthouse's own summary, e.g. "Potential savings of 1.2 s". */
  displayValue: string | null;
  /** Milliseconds Lighthouse estimates fixing this would save, if it says. */
  savingsMs: number | null;
  effort: Effort;
  /** Specific resource URLs the provider flagged. */
  affectedPages: string[];
  /** The provider's rule id, e.g. `render-blocking-resources`. */
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


export interface NotificationPreferences {
  auditCompleted: boolean;
  criticalIssues: boolean;
  /** A run failed, so the scores currently shown are stale. */
  auditFailed: boolean;
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
  /** Heading used on generated reports. */
  reportTitle: string;
  /** Agency or company name shown on reports. */
  brandName: string;
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

/**
 * The signed-in user's whole workspace, assembled server-side and handed to the
 * client store. Trends and uptime are derived rather than stored — see
 * `lib/derive`.
 */
export interface AppState {
  websites: Website[];
  audits: Audit[];
  issues: Issue[];
  trends: Record<string, TrendPoint[]>;
  settings: Settings;
  /** True when PAGESPEED_API_KEY is configured on the server. */
  auditsConfigured: boolean;
  /** Count of rows left by the retired simulated engine, for the cleanup path. */
  simulatedRowCounts: { audits: number; issues: number };
}

/**
 * Shape of the phase-1 localStorage payload, kept only so an existing browser's
 * demo data can be recognised and offered for import. Nothing writes it.
 */
export interface LegacyPersistedState {
  version: number;
  websites: unknown[];
  audits: unknown[];
  issues: unknown[];
}
