"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { healthScore } from "@/lib/scores";
import type { TablesInsert } from "@/types/database";
import type { ActionResult } from "./types";

/**
 * Phase 1 kept everything in localStorage. A browser that used it still has
 * that payload, so rather than silently stranding it we offer a one-off import.
 *
 * The payload is attacker-controlled by definition — it comes from the client —
 * so it is fully re-validated here and every row is written under the caller's
 * own `owner_id`. There is no path by which an import can touch another
 * account's data.
 */

const scoresSchema = z.object({
  performance: z.number().int().min(0).max(100),
  seo: z.number().int().min(0).max(100),
  accessibility: z.number().int().min(0).max(100),
  bestPractices: z.number().int().min(0).max(100),
});

const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid timestamp.");

const legacyWebsiteSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(60),
  url: z.string().trim().min(4).max(2048),
  status: z.enum(["operational", "degraded", "down", "paused"]),
  environment: z.enum(["production", "staging"]),
  team: z.string().trim().max(40).default("Unassigned"),
  tags: z.array(z.string().trim().min(1).max(24)).max(5).default([]),
  monitoringSince: isoDate,
});

const legacyAuditSchema = z.object({
  id: z.string().min(1),
  websiteId: z.string().min(1),
  status: z.enum(["queued", "running", "completed", "failed"]),
  trigger: z.enum(["scheduled", "manual"]),
  device: z.enum(["desktop", "mobile"]),
  startedAt: isoDate,
  durationMs: z.number().int().min(0).max(3_600_000),
  scores: scoresSchema,
  vitals: z.object({
    lcp: z.number().min(0).max(999),
    fcp: z.number().min(0).max(999),
    cls: z.number().min(0).max(99),
    inp: z.number().int().min(0).max(999_999),
    ttfb: z.number().int().min(0).max(999_999),
    tbt: z.number().int().min(0).max(999_999),
    speedIndex: z.number().min(0).max(999),
  }),
  passedChecks: z.number().int().min(0).max(1000),
  totalChecks: z.number().int().min(0).max(1000),
  issuesFound: z.number().int().min(0).max(1000),
  failureReason: z.string().max(500).optional(),
});

const legacyIssueSchema = z.object({
  id: z.string().min(1),
  websiteId: z.string().min(1),
  auditId: z.string().default(""),
  ruleId: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).default(""),
  recommendation: z.string().max(2000).default(""),
  severity: z.enum(["critical", "high", "medium", "low"]),
  category: z.enum([
    "performance",
    "seo",
    "accessibility",
    "best-practices",
    "security",
  ]),
  status: z.enum(["open", "in_progress", "resolved", "ignored"]),
  scoreImpact: z.number().int().min(0).max(100),
  effort: z.enum(["low", "medium", "high"]),
  affectedPages: z.array(z.string().max(200)).max(25).default([]),
  foundAt: isoDate,
});

const legacyStateSchema = z.object({
  websites: z.array(legacyWebsiteSchema).max(100),
  audits: z.array(legacyAuditSchema).max(1000),
  issues: z.array(legacyIssueSchema).max(1000),
});

function normaliseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function importLegacyWorkspace(
  payload: unknown,
): Promise<ActionResult<{ websites: number; audits: number; issues: number }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const parsed = legacyStateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: "That local data could not be read, so nothing was imported.",
    };
  }

  const { websites, audits, issues } = parsed.data;
  if (websites.length === 0) {
    return { ok: false, error: "There were no websites to import." };
  }

  const supabase = await createClient();

  // Skip anything already monitored rather than failing the whole import on a
  // unique-constraint violation.
  const { data: existing, error: existingError } = await supabase
    .from("websites")
    .select("url");

  if (existingError) return { ok: false, error: existingError.message };

  const existingUrls = new Set((existing ?? []).map((row) => row.url));
  const toInsert = websites.filter(
    (website) => !existingUrls.has(normaliseUrl(website.url)),
  );

  if (toInsert.length === 0) {
    return { ok: false, error: "Every website in that data is already imported." };
  }

  const { data: insertedWebsites, error: websiteError } = await supabase
    .from("websites")
    .insert(
      toInsert.map((website) => ({
        owner_id: user.id,
        name: website.name,
        url: normaliseUrl(website.url),
        status: website.status,
        environment: website.environment,
        team: website.team || "Unassigned",
        tags: website.tags,
        created_at: website.monitoringSince,
      })),
    )
    .select("id, url");

  if (websiteError) return { ok: false, error: websiteError.message };

  const idByLegacyId = new Map<string, string>();
  const insertedByUrl = new Map(
    (insertedWebsites ?? []).map((row) => [row.url, row.id]),
  );
  for (const website of toInsert) {
    const id = insertedByUrl.get(normaliseUrl(website.url));
    if (id) idByLegacyId.set(website.id, id);
  }

  // ------------------------------------------------------------------ audits
  const auditRows: TablesInsert<"audits">[] = audits
    .filter((audit) => idByLegacyId.has(audit.websiteId))
    .map((audit) => {
      const completed = audit.status === "completed";
      return {
        website_id: idByLegacyId.get(audit.websiteId)!,
        owner_id: user.id,
        status: audit.status,
        trigger: audit.trigger,
        device: audit.device,
        started_at: audit.startedAt,
        completed_at: completed
          ? new Date(
              new Date(audit.startedAt).getTime() + audit.durationMs,
            ).toISOString()
          : null,
        duration_ms: audit.durationMs,
        performance_score: completed ? audit.scores.performance : null,
        seo_score: completed ? audit.scores.seo : null,
        accessibility_score: completed ? audit.scores.accessibility : null,
        best_practices_score: completed ? audit.scores.bestPractices : null,
        health_score: completed ? healthScore(audit.scores) : null,
        lcp: completed ? audit.vitals.lcp : null,
        fcp: completed ? audit.vitals.fcp : null,
        cls: completed ? audit.vitals.cls : null,
        inp: completed ? audit.vitals.inp : null,
        ttfb: completed ? audit.vitals.ttfb : null,
        tbt: completed ? audit.vitals.tbt : null,
        speed_index: completed ? audit.vitals.speedIndex : null,
        passed_checks: Math.min(audit.passedChecks, audit.totalChecks),
        total_checks: audit.totalChecks,
        issues_found: audit.issuesFound,
        failure_reason: audit.failureReason ?? null,
      };
    });

  let auditIdByLegacyId = new Map<string, string>();

  if (auditRows.length > 0) {
    const { data: insertedAudits, error: auditError } = await supabase
      .from("audits")
      .insert(auditRows)
      .select("id, website_id, started_at");

    if (auditError) return { ok: false, error: auditError.message };

    const byKey = new Map(
      (insertedAudits ?? []).map((row) => [
        `${row.website_id}|${new Date(row.started_at).toISOString()}`,
        row.id,
      ]),
    );

    auditIdByLegacyId = new Map(
      audits
        .filter((audit) => idByLegacyId.has(audit.websiteId))
        .map((audit) => [
          audit.id,
          byKey.get(
            `${idByLegacyId.get(audit.websiteId)}|${new Date(audit.startedAt).toISOString()}`,
          ) ?? "",
        ])
        .filter((entry): entry is [string, string] => entry[1] !== ""),
    );
  }

  // ------------------------------------------------------------------ issues
  const issueRows: TablesInsert<"issues">[] = issues
    .filter((issue) => idByLegacyId.has(issue.websiteId))
    .map((issue) => ({
      website_id: idByLegacyId.get(issue.websiteId)!,
      audit_id: auditIdByLegacyId.get(issue.auditId) ?? null,
      owner_id: user.id,
      rule_id: issue.ruleId,
      title: issue.title,
      description: issue.description,
      recommendation: issue.recommendation,
      severity: issue.severity,
      category: issue.category,
      status: issue.status,
      score_impact: issue.scoreImpact,
      effort: issue.effort,
      affected_pages: issue.affectedPages,
      found_at: issue.foundAt,
    }));

  if (issueRows.length > 0) {
    const { error: issueError } = await supabase.from("issues").insert(issueRows);
    if (issueError) return { ok: false, error: issueError.message };
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    data: {
      websites: toInsert.length,
      audits: auditRows.length,
      issues: issueRows.length,
    },
  };
}
