import { describe, expect, it } from "vitest";
import { toAudit, toWebsite, type AuditListRow } from "./mappers";
import { STALE_RUNNING_MS } from "@/lib/audit/limits";
import type { WebsiteRow } from "@/types/database";

const MINUTE = 60_000;

function auditRow(overrides: Partial<AuditListRow> = {}): AuditListRow {
  return {
    id: "audit-1",
    website_id: "site-1",
    owner_id: "user-1",
    status: "completed",
    trigger: "manual",
    device: "mobile",
    provider: "pagespeed",
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    duration_ms: 20_000,
    performance_score: 90,
    seo_score: 95,
    accessibility_score: 88,
    best_practices_score: 92,
    health_score: 91,
    lcp: 1.2,
    fcp: 0.9,
    cls: 0.01,
    inp: null,
    ttfb: 120,
    tbt: 40,
    speed_index: 2.1,
    passed_checks: 60,
    total_checks: 70,
    issues_found: 10,
    failure_reason: null,
    error_code: null,
    requested_url: "https://weblytics.co.za/",
    final_url: "https://weblytics.co.za/",
    lighthouse_version: "13.4.1",
    analysed_at: new Date().toISOString(),
    field_data_available: false,
    field_scope: null,
    field_overall_category: null,
    field_lcp_ms: null,
    field_inp_ms: null,
    field_cls: null,
    field_fcp_ms: null,
    field_ttfb_ms: null,
    ...overrides,
  };
}

function websiteRow(overrides: Partial<WebsiteRow> = {}): WebsiteRow {
  return {
    id: "site-1",
    owner_id: "user-1",
    name: "Weblytics",
    url: "https://weblytics.co.za",
    status: "operational",
    environment: "production",
    team: "Unassigned",
    tags: [],
    created_at: new Date("2026-01-01").toISOString(),
    updated_at: new Date("2026-01-01").toISOString(),
    ...overrides,
  };
}

describe("toAudit — abandoned runs", () => {
  it("keeps a recent running audit as running", () => {
    const audit = toAudit(
      auditRow({
        status: "running",
        started_at: new Date(Date.now() - 30_000).toISOString(),
        performance_score: null,
        seo_score: null,
        accessibility_score: null,
        best_practices_score: null,
        health_score: null,
        completed_at: null,
      }),
    );

    expect(audit.status).toBe("running");
  });

  /*
   * A crashed or redeployed process leaves a row in `running` forever. Before
   * this, the UI showed a spinner that could never resolve.
   */
  it("presents a run stuck past the timeout as failed", () => {
    const audit = toAudit(
      auditRow({
        status: "running",
        started_at: new Date(Date.now() - STALE_RUNNING_MS - MINUTE).toISOString(),
        performance_score: null,
        seo_score: null,
        accessibility_score: null,
        best_practices_score: null,
        health_score: null,
        completed_at: null,
      }),
    );

    expect(audit.status).toBe("failed");
    expect(audit.errorCode).toBe("abandoned");
    expect(audit.failureReason).toMatch(/did not finish/i);
  });

  it("does not invent scores for an abandoned run", () => {
    const audit = toAudit(
      auditRow({
        status: "running",
        started_at: new Date(Date.now() - STALE_RUNNING_MS - MINUTE).toISOString(),
        performance_score: null,
        seo_score: null,
        accessibility_score: null,
        best_practices_score: null,
        health_score: null,
        completed_at: null,
      }),
    );

    expect(audit.scores).toEqual({
      performance: 0,
      seo: 0,
      accessibility: 0,
      bestPractices: 0,
    });
    expect(audit.healthScore).toBe(0);
    expect(audit.field).toBeNull();
  });

  it("keeps a genuine failure's own reason rather than overwriting it", () => {
    const audit = toAudit(
      auditRow({
        status: "failed",
        started_at: new Date(Date.now() - 2 * STALE_RUNNING_MS).toISOString(),
        failure_reason: "The daily PageSpeed quota has been used up.",
        error_code: "quota-exceeded",
        performance_score: null,
        seo_score: null,
        accessibility_score: null,
        best_practices_score: null,
        health_score: null,
        completed_at: null,
      }),
    );

    expect(audit.errorCode).toBe("quota-exceeded");
    expect(audit.failureReason).toMatch(/quota/i);
  });
});

describe("toAudit — field data never borrows from lab", () => {
  it("returns null field data when Google reported none", () => {
    const audit = toAudit(auditRow({ field_data_available: false, ttfb: 500 }));

    expect(audit.field).toBeNull();
    // The lab value is still present and must not have been copied across.
    expect(audit.vitals.ttfb).toBe(500);
  });

  it("reads field data when it is available, keeping it distinct from lab", () => {
    const audit = toAudit(
      auditRow({
        ttfb: 4,
        field_data_available: true,
        field_scope: "url",
        field_overall_category: "SLOW",
        field_lcp_ms: 4095,
        field_ttfb_ms: 2788,
      }),
    );

    expect(audit.vitals.ttfb).toBe(4);
    expect(audit.field?.ttfbMs).toBe(2788);
    expect(audit.field?.scope).toBe("url");
  });
});

describe("toWebsite — a failed run keeps the last good result visible", () => {
  it("shows the most recent completed scores and reports the failure", () => {
    const good = toAudit(
      auditRow({
        id: "good",
        status: "completed",
        started_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
        performance_score: 98,
        seo_score: 100,
        accessibility_score: 92,
        best_practices_score: 100,
        health_score: 97,
      }),
    );

    const failed = toAudit(
      auditRow({
        id: "failed",
        status: "failed",
        started_at: new Date(Date.now() - 60_000).toISOString(),
        failure_reason: "Google could not load that URL.",
        error_code: "target-unreachable",
        performance_score: null,
        seo_score: null,
        accessibility_score: null,
        best_practices_score: null,
        health_score: null,
        completed_at: null,
      }),
    );

    const website = toWebsite(websiteRow(), [failed, good]);

    // Scores come from the last success, not zeroed out by the failure.
    expect(website.scores.performance).toBe(98);
    expect(website.healthScore).toBeGreaterThan(0);
    expect(website.lastAuditAt).toBe(good.startedAt);

    // ...and the failure is surfaced rather than hidden.
    expect(website.lastFailure).not.toBeNull();
    expect(website.lastFailure?.code).toBe("target-unreachable");
  });

  it("reports no failure when the newest run succeeded", () => {
    const older = toAudit(
      auditRow({
        id: "older",
        status: "failed",
        started_at: new Date(Date.now() - 7_200_000).toISOString(),
        performance_score: null,
        seo_score: null,
        accessibility_score: null,
        best_practices_score: null,
        health_score: null,
        completed_at: null,
      }),
    );
    const newer = toAudit(
      auditRow({ id: "newer", started_at: new Date().toISOString() }),
    );

    const website = toWebsite(websiteRow(), [newer, older]);

    expect(website.lastFailure).toBeNull();
  });

  it("shows no scores at all for a site whose only run failed", () => {
    const failed = toAudit(
      auditRow({
        status: "failed",
        performance_score: null,
        seo_score: null,
        accessibility_score: null,
        best_practices_score: null,
        health_score: null,
        completed_at: null,
      }),
    );

    const website = toWebsite(websiteRow(), [failed]);

    expect(website.lastAuditAt).toBe("");
    expect(website.healthScore).toBe(0);
    expect(website.ttfbMs).toBeNull();
    expect(website.lastFailure).not.toBeNull();
  });

  it("treats 0ms server response as measured, not missing", () => {
    const audit = toAudit(auditRow({ ttfb: 0 }));
    const website = toWebsite(websiteRow(), [audit]);

    expect(website.ttfbMs).toBe(0);
  });

  it("reports no server response time when Lighthouse omitted it", () => {
    const audit = toAudit(auditRow({ ttfb: null }));
    const website = toWebsite(websiteRow(), [audit]);

    expect(website.ttfbMs).toBeNull();
  });
});
