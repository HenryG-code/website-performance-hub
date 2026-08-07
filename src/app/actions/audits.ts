"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { simulateAudit } from "@/lib/audit/simulate";
import type { Scores } from "@/types";
import type { ActionResult } from "./types";

/**
 * Starts an audit: writes a `running` row immediately so the run is visible
 * everywhere at once, then `completeAudit` resolves it. Two steps rather than
 * one so the UI reflects genuine in-flight state rather than faking a spinner.
 */
export async function startAudit(
  websiteId: string,
): Promise<ActionResult<{ auditId: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const supabase = await createClient();

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError) return { ok: false, error: websiteError.message };
  if (!website) return { ok: false, error: "That website no longer exists." };

  const { data, error } = await supabase
    .from("audits")
    .insert({
      website_id: websiteId,
      owner_id: user.id,
      status: "running",
      trigger: "manual",
      device: "desktop",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, data: { auditId: data.id } };
}

/**
 * Resolves a running audit: computes scores, writes lab metrics, opens any new
 * findings, and moves the website out of `paused` once it has a first result.
 */
export async function completeAudit(auditId: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const supabase = await createClient();

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .select("id, website_id, status")
    .eq("id", auditId)
    .maybeSingle();

  if (auditError) return { ok: false, error: auditError.message };
  if (!audit) return { ok: false, error: "That audit no longer exists." };
  // Guards against a double-submit resolving the same run twice.
  if (audit.status !== "running") return { ok: true };

  const [{ data: previous }, { data: openIssues }] = await Promise.all([
    supabase
      .from("audits")
      .select(
        "performance_score, seo_score, accessibility_score, best_practices_score",
      )
      .eq("website_id", audit.website_id)
      .eq("status", "completed")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("issues")
      .select("rule_id")
      .eq("website_id", audit.website_id)
      .in("status", ["open", "in_progress"]),
  ]);

  const previousScores: Scores | null = previous
    ? {
        performance: previous.performance_score ?? 0,
        seo: previous.seo_score ?? 0,
        accessibility: previous.accessibility_score ?? 0,
        bestPractices: previous.best_practices_score ?? 0,
      }
    : null;

  const result = simulateAudit({
    previousScores,
    activeRuleIds: (openIssues ?? []).map((row) => row.rule_id),
    seed: Math.floor(Math.random() * 2 ** 31),
  });

  const completedAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("audits")
    .update({
      status: "completed",
      completed_at: completedAt,
      duration_ms: result.durationMs,
      performance_score: result.scores.performance,
      seo_score: result.scores.seo,
      accessibility_score: result.scores.accessibility,
      best_practices_score: result.scores.bestPractices,
      health_score: result.health,
      lcp: result.vitals.lcp,
      fcp: result.vitals.fcp,
      cls: result.vitals.cls,
      inp: result.vitals.inp,
      ttfb: result.vitals.ttfb,
      tbt: result.vitals.tbt,
      speed_index: result.vitals.speedIndex,
      passed_checks: result.passedChecks,
      total_checks: result.totalChecks,
      issues_found: result.newFindings.length,
    })
    .eq("id", auditId);

  if (updateError) return { ok: false, error: updateError.message };

  if (result.newFindings.length > 0) {
    const { error: issuesError } = await supabase.from("issues").insert(
      result.newFindings.map((template) => ({
        website_id: audit.website_id,
        audit_id: auditId,
        owner_id: user.id,
        rule_id: template.ruleId,
        title: template.title,
        description: template.description,
        recommendation: template.recommendation,
        severity: template.severity,
        category: template.category,
        status: "open" as const,
        score_impact: template.scoreImpact,
        effort: template.effort,
        affected_pages: template.pages,
        found_at: completedAt,
      })),
    );

    if (issuesError) return { ok: false, error: issuesError.message };
  }

  // A website is `paused` until its first result arrives; after that its status
  // tracks how healthy the latest run was.
  const nextStatus =
    result.health >= 60 ? "operational" : result.health >= 40 ? "degraded" : "down";

  await supabase
    .from("websites")
    .update({ status: nextStatus })
    .eq("id", audit.website_id);

  revalidatePath("/", "layout");
  return { ok: true };
}
