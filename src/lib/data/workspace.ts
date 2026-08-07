import "server-only";

import { createClient } from "@/lib/supabase/server";
import { trendsByWebsite } from "@/lib/derive/trends";
import { toAudit, toIssue, toSettings, toWebsite, uptimeMapFor } from "./mappers";
import type { AppState, Audit, Website } from "@/types";

/**
 * Loads everything the signed-in user's dashboard needs, in one place.
 *
 * The whole workspace is fetched once per navigation rather than per page.
 * At this scale (tens of websites, hundreds of audits) that is a handful of
 * indexed queries, and it lets every phase-1 component keep reading from a
 * single in-memory state object instead of being rewritten around per-page
 * fetches. If a workspace ever grows large enough for this to hurt, the
 * per-entity queries below are already the seam to paginate at.
 *
 * Every query is scoped by RLS to the caller. `owner_id` filters are not
 * repeated here — the database enforces them, and duplicating the check in
 * application code would imply the policy alone is not trusted.
 */
export async function getWorkspace(userId: string, email: string): Promise<AppState> {
  const supabase = await createClient();

  const [websitesResult, auditsResult, issuesResult, profileResult, prefsResult] =
    await Promise.all([
      supabase.from("websites").select("*").order("created_at", { ascending: false }),
      supabase.from("audits").select("*").order("started_at", { ascending: false }),
      supabase.from("issues").select("*").order("found_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("report_preferences")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle(),
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

  const today = new Date();
  const websites: Website[] = (websitesResult.data ?? []).map((row) =>
    toWebsite(row, auditsBySite.get(row.id) ?? [], today),
  );

  const websiteIds = websites.map((website) => website.id);

  return {
    websites,
    audits,
    issues: (issuesResult.data ?? []).map(toIssue),
    trends: trendsByWebsite(websiteIds, audits),
    uptime: uptimeMapFor(websites, today),
    settings: toSettings(profileResult.data, prefsResult.data, email),
  };
}
