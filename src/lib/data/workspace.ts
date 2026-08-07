import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hasApiKey } from "@/lib/pagespeed/client";
import { trendsByWebsite } from "@/lib/derive/trends";
import { toAudit, toIssue, toSettings, toWebsite } from "./mappers";
import type { AppState, Audit, Website } from "@/types";

/**
 * Columns selected for the audit list.
 *
 * `raw_response` is deliberately excluded: it is 300KB-1MB per run, and pulling
 * it for every audit would dominate the payload. The audit detail page fetches
 * it on demand for the one run being viewed.
 */
const AUDIT_COLUMNS =
  "id, website_id, owner_id, status, trigger, device, provider, started_at, completed_at, duration_ms, performance_score, seo_score, accessibility_score, best_practices_score, health_score, lcp, fcp, cls, inp, ttfb, tbt, speed_index, passed_checks, total_checks, issues_found, failure_reason, error_code, requested_url, final_url, lighthouse_version, analysed_at, created_at, field_data_available, field_scope, field_overall_category, field_lcp_ms, field_inp_ms, field_cls, field_fcp_ms, field_ttfb_ms" as const;

/**
 * Loads everything the signed-in user's dashboard needs.
 *
 * Every query is scoped by RLS to the caller. `owner_id` filters are not
 * repeated here — the database enforces them, and duplicating the check in
 * application code would imply the policy alone is not trusted.
 */
export async function getWorkspace(
  userId: string,
  email: string,
): Promise<AppState> {
  const supabase = await createClient();

  const [
    websitesResult,
    auditsResult,
    issuesResult,
    profileResult,
    prefsResult,
    simulatedAuditsResult,
    simulatedIssuesResult,
  ] = await Promise.all([
    supabase.from("websites").select("*").order("created_at", { ascending: false }),
    supabase
      .from("audits")
      .select(AUDIT_COLUMNS)
      .order("started_at", { ascending: false })
      .limit(500),
    supabase.from("issues").select("*").order("found_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("report_preferences")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle(),
    supabase
      .from("audits")
      .select("id", { count: "exact", head: true })
      .eq("provider", "simulated"),
    supabase
      .from("issues")
      .select("id", { count: "exact", head: true })
      .eq("provider", "simulated"),
  ]);

  const firstError =
    websitesResult.error ??
    auditsResult.error ??
    issuesResult.error ??
    profileResult.error ??
    prefsResult.error;

  if (firstError) {
    throw new Error(`Could not load your workspace: ${firstError.message}`);
  }

  const audits: Audit[] = (auditsResult.data ?? []).map(toAudit);

  const auditsBySite = new Map<string, Audit[]>();
  for (const audit of audits) {
    const list = auditsBySite.get(audit.websiteId);
    if (list) list.push(audit);
    else auditsBySite.set(audit.websiteId, [audit]);
  }

  const websites: Website[] = (websitesResult.data ?? []).map((row) =>
    toWebsite(row, auditsBySite.get(row.id) ?? []),
  );

  return {
    websites,
    audits,
    issues: (issuesResult.data ?? []).map(toIssue),
    trends: trendsByWebsite(
      websites.map((website) => website.id),
      audits,
    ),
    settings: toSettings(profileResult.data, prefsResult.data, email),
    auditsConfigured: hasApiKey(),
    simulatedRowCounts: {
      audits: simulatedAuditsResult.count ?? 0,
      issues: simulatedIssuesResult.count ?? 0,
    },
  };
}

/** Fetches one audit's verbatim provider response, for the detail view. */
export async function getAuditRawResponse(
  auditId: string,
): Promise<unknown | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audits")
    .select("raw_response")
    .eq("id", auditId)
    .maybeSingle();

  if (error || !data) return null;
  return data.raw_response;
}
