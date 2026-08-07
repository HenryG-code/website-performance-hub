"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { createSeedState } from "@/lib/mock/generate";
import type { TablesInsert } from "@/types/database";
import type { ActionResult } from "./types";

/**
 * Fills the signed-in user's workspace with the phase-1 demo dataset.
 *
 * Development only. Production builds refuse outright rather than relying on
 * the UI to hide the button — a server action is a public endpoint, so the
 * guard has to live on the server.
 *
 * Everything is written under the caller's own `owner_id`, so seeding is
 * scoped to one account and cannot touch anyone else's data.
 */
export async function seedDemoWorkspace(): Promise<ActionResult> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "Demo data cannot be seeded in production." };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("websites")
    .select("id", { count: "exact", head: true });

  if (countError) return { ok: false, error: countError.message };
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error:
        "Your workspace already has websites. Remove them first if you want a clean demo set.",
    };
  }

  const seed = createSeedState();

  // ------------------------------------------------------------- websites
  const websiteRows: TablesInsert<"websites">[] = seed.websites.map((website) => ({
    owner_id: user.id,
    name: website.name,
    url: website.url,
    status: website.status,
    environment: website.environment,
    team: website.team,
    tags: website.tags,
    created_at: website.monitoringSince,
  }));

  const { data: insertedWebsites, error: websiteError } = await supabase
    .from("websites")
    .insert(websiteRows)
    .select("id, url");

  if (websiteError) return { ok: false, error: websiteError.message };

  // The generator uses readable ids; Postgres assigns real UUIDs. Map between
  // them on URL, which is unique per owner.
  const websiteIdByUrl = new Map(
    (insertedWebsites ?? []).map((row) => [row.url, row.id]),
  );
  const websiteIdBySeedId = new Map(
    seed.websites.map((website) => [
      website.id,
      websiteIdByUrl.get(website.url) ?? "",
    ]),
  );

  // --------------------------------------------------------------- audits
  const auditRows: TablesInsert<"audits">[] = seed.audits
    .filter((audit) => websiteIdBySeedId.get(audit.websiteId))
    .map((audit) => {
      const completed = audit.status === "completed";
      return {
        website_id: websiteIdBySeedId.get(audit.websiteId)!,
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
        health_score: completed ? audit.healthScore : null,
        lcp: completed ? audit.vitals.lcp : null,
        fcp: completed ? audit.vitals.fcp : null,
        cls: completed ? audit.vitals.cls : null,
        inp: completed ? audit.vitals.inp : null,
        ttfb: completed ? audit.vitals.ttfb : null,
        tbt: completed ? audit.vitals.tbt : null,
        speed_index: completed ? audit.vitals.speedIndex : null,
        passed_checks: audit.passedChecks,
        total_checks: audit.totalChecks,
        issues_found: audit.issuesFound,
        failure_reason: audit.failureReason ?? null,
      };
    });

  const { data: insertedAudits, error: auditError } = await supabase
    .from("audits")
    .insert(auditRows)
    .select("id, started_at, website_id");

  if (auditError) return { ok: false, error: auditError.message };

  // Match seed audits back to their rows on (website, started_at), which is
  // unique within the generated dataset.
  const auditIdByKey = new Map(
    (insertedAudits ?? []).map((row) => [
      `${row.website_id}|${new Date(row.started_at).toISOString()}`,
      row.id,
    ]),
  );

  // --------------------------------------------------------------- issues
  const issueRows: TablesInsert<"issues">[] = seed.issues
    .filter((issue) => websiteIdBySeedId.get(issue.websiteId))
    .map((issue) => {
      const websiteId = websiteIdBySeedId.get(issue.websiteId)!;
      const sourceAudit = seed.audits.find((audit) => audit.id === issue.auditId);
      const auditId = sourceAudit
        ? (auditIdByKey.get(
            `${websiteId}|${new Date(sourceAudit.startedAt).toISOString()}`,
          ) ?? null)
        : null;

      return {
        website_id: websiteId,
        audit_id: auditId,
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
      };
    });

  const { error: issueError } = await supabase.from("issues").insert(issueRows);
  if (issueError) return { ok: false, error: issueError.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Removes every website the user owns — audits and issues follow via cascade.
 * Available in any environment: it only ever touches the caller's own rows.
 */
export async function clearWorkspace(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("websites").delete().eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
