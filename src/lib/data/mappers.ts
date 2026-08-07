import { healthScore } from "@/lib/scores";
import { initialsFrom } from "@/lib/format";
import { responseTimeFor, uptimeForWebsite, uptimePercent } from "@/lib/derive/uptime";
import type {
  AuditRow,
  IssueRow,
  ProfileRow,
  ReportPreferencesRow,
  WebsiteRow,
} from "@/types/database";
import type {
  Audit,
  Issue,
  Scores,
  Settings,
  UptimeDay,
  WebVitals,
  Website,
} from "@/types";

const EMPTY_SCORES: Scores = {
  performance: 0,
  seo: 0,
  accessibility: 0,
  bestPractices: 0,
};

const EMPTY_VITALS: WebVitals = {
  lcp: 0,
  cls: 0,
  inp: 0,
  ttfb: 0,
  fcp: 0,
  tbt: 0,
  speedIndex: 0,
};

/**
 * Database rows use snake_case and nullable score columns; the UI was built
 * against camelCase domain objects with non-null scores. Mapping here means not
 * a single component from phase 1 had to change to read real data.
 */
export function toAudit(row: AuditRow): Audit {
  const scores: Scores =
    row.status === "completed"
      ? {
          performance: row.performance_score ?? 0,
          seo: row.seo_score ?? 0,
          accessibility: row.accessibility_score ?? 0,
          bestPractices: row.best_practices_score ?? 0,
        }
      : EMPTY_SCORES;

  return {
    id: row.id,
    websiteId: row.website_id,
    status: row.status,
    trigger: row.trigger,
    device: row.device,
    startedAt: row.started_at,
    durationMs: row.duration_ms,
    scores,
    healthScore: row.health_score ?? 0,
    vitals:
      row.status === "completed"
        ? {
            lcp: Number(row.lcp ?? 0),
            fcp: Number(row.fcp ?? 0),
            cls: Number(row.cls ?? 0),
            inp: row.inp ?? 0,
            ttfb: row.ttfb ?? 0,
            tbt: row.tbt ?? 0,
            speedIndex: Number(row.speed_index ?? 0),
          }
        : EMPTY_VITALS,
    issuesFound: row.issues_found,
    passedChecks: row.passed_checks,
    totalChecks: row.total_checks,
    failureReason: row.failure_reason ?? undefined,
  };
}

export function toIssue(row: IssueRow): Issue {
  return {
    id: row.id,
    websiteId: row.website_id,
    auditId: row.audit_id ?? "",
    title: row.title,
    description: row.description,
    recommendation: row.recommendation,
    severity: row.severity,
    category: row.category,
    status: row.status,
    foundAt: row.found_at,
    updatedAt: row.updated_at,
    scoreImpact: row.score_impact,
    effort: row.effort,
    affectedPages: row.affected_pages,
    ruleId: row.rule_id,
  };
}

/**
 * A website's headline scores are those of its most recent completed audit —
 * they are not stored on the website row, so there is no chance of the two
 * drifting apart.
 */
export function toWebsite(
  row: WebsiteRow,
  auditsForSite: Audit[],
  today: Date,
): Website {
  const latestCompleted = auditsForSite
    .filter((audit) => audit.status === "completed")
    .sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )[0];

  const scores = latestCompleted?.scores ?? EMPTY_SCORES;
  const health = latestCompleted ? healthScore(scores) : 0;

  const base: Website = {
    id: row.id,
    name: row.name,
    url: row.url,
    initials: initialsFrom(row.name),
    environment: row.environment,
    team: row.team,
    tags: row.tags,
    status: row.status,
    scores,
    healthScore: health,
    uptime30d: 100,
    avgResponseMs: latestCompleted
      ? responseTimeFor(row.id, scores.performance)
      : 0,
    lastAuditAt: latestCompleted?.startedAt ?? "",
    monitoringSince: row.created_at,
  };

  const uptime = uptimeForWebsite(base, today);
  return { ...base, uptime30d: uptimePercent(uptime) };
}

export function uptimeMapFor(
  websites: Website[],
  today: Date,
): Record<string, UptimeDay[]> {
  return Object.fromEntries(
    websites.map((website) => [website.id, uptimeForWebsite(website, today)]),
  );
}

export function toSettings(
  profile: ProfileRow | null,
  preferences: ReportPreferencesRow | null,
  email: string,
): Settings {
  return {
    profile: {
      name: profile?.full_name ?? "",
      email,
      role: profile?.role ?? "",
      company: profile?.company ?? "",
      timezone: profile?.timezone ?? "UTC",
    },
    notifications: {
      auditCompleted: preferences?.notify_audit_completed ?? true,
      criticalIssues: preferences?.notify_critical_issues ?? true,
      uptimeIncidents: preferences?.notify_uptime_incidents ?? true,
      scoreDrops: preferences?.notify_score_drops ?? false,
      weeklyDigest: preferences?.notify_weekly_digest ?? true,
      productUpdates: preferences?.notify_product_updates ?? false,
    },
    auditFrequency: preferences?.audit_frequency ?? "daily",
    defaultDevice: preferences?.default_device ?? "desktop",
    scoreThreshold: preferences?.score_threshold ?? 70,
    reportTitle: preferences?.report_title ?? "Website performance report",
    brandName: preferences?.brand_name ?? "",
  };
}
