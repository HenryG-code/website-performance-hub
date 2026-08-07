"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { PageSpeedError, hasApiKey, runPageSpeed } from "@/lib/pagespeed/client";
import { mapPageSpeedResponse } from "@/lib/pagespeed/map";
import type { PsiStrategy } from "@/lib/pagespeed/types";
import { assertPublicUrl } from "@/lib/security/url-guard";
import {
  AUDIT_COOLDOWN_MS,
  STALE_RUNNING_MS,
  evaluateThrottle,
} from "@/lib/audit/limits";
import { healthScore } from "@/lib/scores";
import type { Json, TablesInsert } from "@/types/database";
import type { ActionResult } from "./types";

const STRATEGIES: PsiStrategy[] = ["mobile", "desktop"];

function isStrategy(value: unknown): value is PsiStrategy {
  return typeof value === "string" && STRATEGIES.includes(value as PsiStrategy);
}

/**
 * Runs one real PageSpeed Insights audit and stores the result.
 *
 * Synchronous by design: the whole run happens inside this action and the row
 * is written once, terminal. A previous phase wrote a `running` row and
 * resolved it from a client-side timer, which meant a closed tab left the row
 * stuck forever. Here, a `running` row exists only for the life of the request,
 * and a crashed request leaves a row that the staleness check can reclaim.
 *
 * Every displayed number downstream comes from the `raw_response` stored here.
 * Nothing is invented: a failed run stores the failure and leaves the previous
 * successful audit untouched and still displayed.
 */
export async function runAudit(
  websiteId: string,
  strategyInput: unknown = "mobile",
): Promise<ActionResult<{ auditId: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  if (!isStrategy(strategyInput)) {
    return { ok: false, error: "Choose either the mobile or desktop strategy." };
  }
  const strategy = strategyInput;

  const supabase = await createClient();

  // ---------------------------------------------------------- authorization
  // RLS already restricts this to the caller's own rows; the explicit lookup
  // turns "not yours" into a clear message instead of a silent no-op.
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id, url, name")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError) return { ok: false, error: websiteError.message };
  if (!website) {
    return { ok: false, error: "That website is not in your account." };
  }

  // ------------------------------------------------------------- URL safety
  // The stored URL is re-validated on every run rather than trusted from when
  // it was added: DNS can change, and a hostname that was public last week can
  // point at an internal address today.
  const guard = await assertPublicUrl(website.url);
  if (!guard.ok) {
    return {
      ok: false,
      error: guard.message ?? "That URL cannot be audited.",
    };
  }
  const targetUrl = guard.url!;

  if (!hasApiKey()) {
    return {
      ok: false,
      error:
        "PageSpeed is not configured. Add PAGESPEED_API_KEY to your environment and restart the server.",
    };
  }

  // ------------------------------------------------ throttling and dedupe
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - STALE_RUNNING_MS).toISOString();
  const hourAgo = new Date(now.getTime() - 3_600_000).toISOString();
  const dayAgo = new Date(now.getTime() - 86_400_000).toISOString();
  const cooldownAgo = new Date(now.getTime() - AUDIT_COOLDOWN_MS).toISOString();

  const [runningResult, recentResult, hourResult, dayResult] = await Promise.all([
    supabase
      .from("audits")
      .select("id", { count: "exact", head: true })
      .eq("website_id", websiteId)
      .eq("device", strategy)
      .eq("status", "running")
      .gte("started_at", staleCutoff),
    supabase
      .from("audits")
      .select("started_at")
      .eq("website_id", websiteId)
      .eq("device", strategy)
      .gte("started_at", cooldownAgo)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("audits")
      .select("id", { count: "exact", head: true })
      .gte("created_at", hourAgo),
    supabase
      .from("audits")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayAgo),
  ]);

  const throttle = evaluateThrottle({
    hasRunningAudit: (runningResult.count ?? 0) > 0,
    lastRunStartedAt: recentResult.data?.started_at
      ? new Date(recentResult.data.started_at)
      : null,
    auditsInLastHour: hourResult.count ?? 0,
    auditsInLastDay: dayResult.count ?? 0,
    now,
  });

  if (!throttle.allowed) {
    return { ok: false, error: throttle.message ?? "Try again shortly." };
  }

  // ------------------------------------------------------- claim the run
  const startedAt = now.toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("audits")
    .insert({
      website_id: websiteId,
      owner_id: user.id,
      status: "running",
      provider: "pagespeed",
      trigger: "manual",
      device: strategy,
      started_at: startedAt,
      requested_url: targetUrl,
    })
    .select("id")
    .single();

  if (claimError) return { ok: false, error: claimError.message };
  const auditId = claimed.id;

  // ------------------------------------------------------------- run it
  try {
    const psi = await runPageSpeed({ url: targetUrl, strategy });
    const mapped = mapPageSpeedResponse(psi, strategy);

    // Google can follow a redirect off the public internet. Refuse to store a
    // result whose final URL is somewhere we would never have agreed to audit.
    if (mapped.finalUrl) {
      const finalGuard = await assertPublicUrl(mapped.finalUrl);
      if (!finalGuard.ok) {
        throw new PageSpeedError(
          "target-unreachable",
          "That URL redirected to a private or internal address, so the result was discarded.",
        );
      }
    }

    const { performance, seo, accessibility, bestPractices } = mapped.scores;
    if (
      performance === undefined ||
      seo === undefined ||
      accessibility === undefined ||
      bestPractices === undefined
    ) {
      throw new PageSpeedError(
        "bad-response",
        "PageSpeed did not return all four category scores for this page.",
      );
    }

    const scores = { performance, seo, accessibility, bestPractices };
    const completedAt = new Date();

    const toSeconds = (ms: number | null) =>
      ms === null ? null : Math.round((ms / 1000) * 100) / 100;

    const { error: updateError } = await supabase
      .from("audits")
      .update({
        status: "completed",
        completed_at: completedAt.toISOString(),
        duration_ms: completedAt.getTime() - now.getTime(),
        requested_url: mapped.requestedUrl ?? targetUrl,
        final_url: mapped.finalUrl,
        lighthouse_version: mapped.lighthouseVersion,
        analysed_at: mapped.analysedAt,
        raw_response: psi as unknown as Json,

        performance_score: scores.performance,
        seo_score: scores.seo,
        accessibility_score: scores.accessibility,
        best_practices_score: scores.bestPractices,
        health_score: healthScore(scores),

        // Lab metrics. Seconds for the paint timings, milliseconds for the rest,
        // matching the existing column semantics.
        lcp: toSeconds(mapped.lab.lcpMs),
        fcp: toSeconds(mapped.lab.fcpMs),
        speed_index: toSeconds(mapped.lab.speedIndexMs),
        cls: mapped.lab.cls === null ? null : Math.round(mapped.lab.cls * 1000) / 1000,
        tbt: mapped.lab.tbtMs === null ? null : Math.round(mapped.lab.tbtMs),
        ttfb: mapped.lab.ttfbMs === null ? null : Math.round(mapped.lab.ttfbMs),
        // Lighthouse has no lab INP; it is a field-only metric.
        inp: null,

        field_data_available: mapped.field.available,
        field_scope: mapped.field.scope,
        field_overall_category: mapped.field.overallCategory,
        field_lcp_ms: mapped.field.lcpMs,
        field_inp_ms: mapped.field.inpMs,
        field_cls:
          mapped.field.cls === null
            ? null
            : Math.round(mapped.field.cls * 1000) / 1000,
        field_fcp_ms: mapped.field.fcpMs,
        field_ttfb_ms: mapped.field.ttfbMs,

        passed_checks: mapped.passedCount,
        total_checks: mapped.totalCount,
        issues_found: mapped.findings.length,
        failure_reason: null,
        error_code: null,
      })
      .eq("id", auditId);

    if (updateError) throw updateError;

    // ----------------------------------------------------------- findings
    // Findings are replaced per run rather than accumulated: Lighthouse reports
    // the complete current state of the page every time, so a finding absent
    // from this run has genuinely been resolved.
    await supabase
      .from("issues")
      .delete()
      .eq("website_id", websiteId)
      .eq("provider", "pagespeed");

    if (mapped.findings.length > 0) {
      const rows: TablesInsert<"issues">[] = mapped.findings.map((finding) => ({
        website_id: websiteId,
        audit_id: auditId,
        owner_id: user.id,
        provider: "pagespeed" as const,
        rule_id: finding.ruleId,
        title: finding.title.slice(0, 200),
        description: finding.description.slice(0, 2000),
        // Lighthouse folds the fix guidance into its description, so there is
        // no separate recommendation to store. Leaving it empty is honest;
        // paraphrasing it would be inventing advice Google did not give.
        recommendation: "",
        severity: finding.severity,
        category: finding.category,
        status: "open" as const,
        kind: finding.kind,
        display_value: finding.displayValue?.slice(0, 200) ?? null,
        savings_ms: finding.savingsMs,
        score_impact: Math.min(100, Math.max(0, finding.scoreImpact)),
        affected_pages: finding.affectedResources.slice(0, 25),
        found_at: completedAt.toISOString(),
      }));

      const { error: issuesError } = await supabase.from("issues").insert(rows);
      if (issuesError) throw issuesError;
    }

    await supabase
      .from("websites")
      .update({
        status:
          healthScore(scores) >= 60
            ? "operational"
            : healthScore(scores) >= 40
              ? "degraded"
              : "down",
      })
      .eq("id", websiteId);

    revalidatePath("/", "layout");
    return { ok: true, data: { auditId } };
  } catch (error) {
    const isPsi = error instanceof PageSpeedError;
    const message = isPsi
      ? error.userMessage
      : "Something went wrong storing the audit result.";

    // Record the failure against the row we already claimed. The website's
    // previous successful audit is left alone, so the dashboard keeps showing
    // the last known-good result rather than dropping to zero.
    await supabase
      .from("audits")
      .update({
        status: "failed",
        failure_reason: message.slice(0, 500),
        error_code: isPsi ? error.code : "storage-error",
        duration_ms: Date.now() - now.getTime(),
      })
      .eq("id", auditId);

    revalidatePath("/", "layout");
    return { ok: false, error: message };
  }
}

/**
 * Marks runs abandoned by a crashed request as failed.
 *
 * Called opportunistically when the workspace loads, so a stuck spinner
 * resolves itself rather than needing manual intervention.
 */
export async function reapStaleAudits(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const cutoff = new Date(Date.now() - STALE_RUNNING_MS).toISOString();
  const supabase = await createClient();

  const { error } = await supabase
    .from("audits")
    .update({
      status: "failed",
      failure_reason: "The audit did not finish. Run it again.",
      error_code: "abandoned",
    })
    .eq("status", "running")
    .lt("started_at", cutoff);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
