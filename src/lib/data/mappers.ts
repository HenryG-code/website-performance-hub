import { healthScore } from "@/lib/scores";
import { initialsFrom } from "@/lib/format";
import { STALE_RUNNING_MS } from "@/lib/audit/limits";
import type {
  AuditRow,
  IssueRow,
  ProfileRow,
  ReportPreferencesRow,
  WebsiteRow,
} from "@/types/database";
import type {
  Audit,
  CruxCategory,
  FieldVitals,
  Issue,
  Scores,
  Settings,
  WebVitals,
  Website,
} from "@/types";

/** Audit rows are listed without the large `raw_response` column. */
export type AuditListRow = Omit<AuditRow, "raw_response">;

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
 * Database rows use snake_case and nullable columns; the UI reads camelCase
 * domain objects. Mapping here keeps the component layer unchanged.
 *
 * Nullability is preserved deliberately. A metric Google did not report stays
 * null all the way to the screen, where it renders as "not reported" — turning
 * it into 0 here would be indistinguishable from a real measurement of zero.
 */
/**
 * Published Core Web Vitals thresholds. Only the overall CrUX category is
 * stored, so per-metric bands are re-derived from the stored percentiles using
 * Google's own cut-offs rather than being guessed.
 */
function band(
  value: number | null,
  good: number,
  poor: number,
): CruxCategory | null {
  if (value === null) return null;
  if (value <= good) return "FAST";
  if (value <= poor) return "AVERAGE";
  return "SLOW";
}

function fieldFrom(row: AuditListRow): FieldVitals | null {
  if (!row.field_data_available) return null;

  const cls = row.field_cls === null ? null : Number(row.field_cls);

  return {
    scope: row.field_scope,
    overallCategory: row.field_overall_category,
    lcpMs: row.field_lcp_ms,
    inpMs: row.field_inp_ms,
    cls,
    fcpMs: row.field_fcp_ms,
    ttfbMs: row.field_ttfb_ms,
    categories: {
      lcp: band(row.field_lcp_ms, 2500, 4000),
      inp: band(row.field_inp_ms, 200, 500),
      cls: band(cls, 0.1, 0.25),
      fcp: band(row.field_fcp_ms, 1800, 3000),
      ttfb: band(row.field_ttfb_ms, 800, 1800),
    },
  };
}

export function toAudit(row: AuditListRow): Audit {
  /*
   * A run still marked `running` long past the provider timeout did not
   * finish — the process handling it died. Presenting it as failed is an
   * inference from a fact, not an invention, and it stops the UI showing a
   * spinner that would never resolve. The row itself is corrected in the
   * database the next time an audit runs, or on demand from the audits list.
   */
  const abandoned =
    row.status === "running" &&
    Date.now() - new Date(row.started_at).getTime() > STALE_RUNNING_MS;

  const status: Audit["status"] = abandoned ? "failed" : row.status;
  const completed = status === "completed";

  const scores: Scores = completed
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
    status,
    trigger: row.trigger,
    device: row.device,
    provider: row.provider,
    startedAt: row.started_at,
    durationMs: row.duration_ms,
    scores,
    healthScore: row.health_score ?? 0,
    vitals: completed
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
    field: fieldFrom(row),
    labTtfbMs: completed ? row.ttfb : null,
    requestedUrl: row.requested_url,
    finalUrl: row.final_url,
    lighthouseVersion: row.lighthouse_version,
    analysedAt: row.analysed_at,
    issuesFound: row.issues_found,
    passedChecks: row.passed_checks,
    totalChecks: row.total_checks,
    failureReason: abandoned
      ? "The audit did not finish. Run it again."
      : (row.failure_reason ?? undefined),
    errorCode: abandoned ? "abandoned" : (row.error_code ?? undefined),
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
    kind: row.kind,
    provider: row.provider,
    foundAt: row.found_at,
    updatedAt: row.updated_at,
    scoreImpact: row.score_impact,
    displayValue: row.display_value,
    savingsMs: row.savings_ms,
    effort: row.effort,
    affectedPages: row.affected_pages,
    ruleId: row.rule_id,
  };
}

/**
 * A website's headline figures come from its most recent completed audit, so
 * the two can never disagree. A failed run afterwards is surfaced separately
 * rather than overwriting the last known-good result.
 */
export function toWebsite(row: WebsiteRow, auditsForSite: Audit[]): Website {
  const byNewest = [...auditsForSite].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  const latestCompleted = byNewest.find((audit) => audit.status === "completed");
  const newest = byNewest[0];

  const scores = latestCompleted?.scores ?? EMPTY_SCORES;

  const lastFailure =
    newest && newest.status === "failed"
      ? {
          at: newest.startedAt,
          reason: newest.failureReason ?? "The audit failed.",
          code: newest.errorCode ?? null,
        }
      : null;

  return {
    id: row.id,
    name: row.name,
    url: row.url,
    initials: initialsFrom(row.name),
    environment: row.environment,
    team: row.team,
    tags: row.tags,
    status: row.status,
    scores,
    healthScore: latestCompleted ? healthScore(scores) : 0,
    // Real measured server response time. Null only when no completed audit
    // exists or Lighthouse omitted it — never as a stand-in for a fast 0ms.
    ttfbMs: latestCompleted?.labTtfbMs ?? null,
    field: latestCompleted?.field ?? null,
    lastAuditAt: latestCompleted?.startedAt ?? "",
    lastFailure,
    monitoringSince: row.created_at,
  };
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
      auditFailed: preferences?.notify_audit_failed ?? true,
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
