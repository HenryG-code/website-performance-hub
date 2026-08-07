"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionResult } from "./types";

export interface SimulatedDataSummary {
  audits: number;
  issues: number;
  /** Names of websites that would be left with no audit history at all. */
  websitesLeftWithoutHistory: string[];
}

/**
 * Reports what the retired simulated engine left behind.
 *
 * Deliberately separate from deletion so the UI can show exactly what will go
 * before anything is removed.
 */
export async function countSimulatedData(): Promise<
  ActionResult<SimulatedDataSummary>
> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const supabase = await createClient();

  const [auditsResult, issuesResult, websitesResult] = await Promise.all([
    supabase.from("audits").select("id, website_id, provider"),
    supabase
      .from("issues")
      .select("id", { count: "exact", head: true })
      .eq("provider", "simulated"),
    supabase.from("websites").select("id, name"),
  ]);

  const error = auditsResult.error ?? issuesResult.error ?? websitesResult.error;
  if (error) return { ok: false, error: error.message };

  const audits = auditsResult.data ?? [];
  const simulated = audits.filter((row) => row.provider === "simulated");
  const realBySite = new Set(
    audits.filter((row) => row.provider !== "simulated").map((row) => row.website_id),
  );

  // Warn about sites whose entire history is simulated: deleting leaves them
  // with no audits at all until a real one is run.
  const affected = new Set(simulated.map((row) => row.website_id));
  const websitesLeftWithoutHistory = (websitesResult.data ?? [])
    .filter((site) => affected.has(site.id) && !realBySite.has(site.id))
    .map((site) => site.name);

  return {
    ok: true,
    data: {
      audits: simulated.length,
      issues: issuesResult.count ?? 0,
      websitesLeftWithoutHistory,
    },
  };
}

/**
 * Deletes every simulated audit and finding the caller owns.
 *
 * Requires the caller to echo back the exact audit count they were shown, so a
 * stale confirmation dialog cannot delete more than the user agreed to. Website
 * records are never touched.
 */
export async function deleteSimulatedData(
  confirmedAuditCount: number,
): Promise<ActionResult<{ audits: number; issues: number }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  if (!Number.isInteger(confirmedAuditCount) || confirmedAuditCount < 0) {
    return { ok: false, error: "Confirmation value was not valid." };
  }

  const summary = await countSimulatedData();
  if (!summary.ok) return summary;

  const actual = summary.data!.audits;
  if (actual !== confirmedAuditCount) {
    return {
      ok: false,
      error: `The number of simulated audits changed (${actual} now, ${confirmedAuditCount} when you confirmed). Nothing was deleted — review and try again.`,
    };
  }

  if (actual === 0) {
    return { ok: true, data: { audits: 0, issues: 0 } };
  }

  const supabase = await createClient();

  // Findings first: they reference audits, and deleting an audit would only
  // null the link rather than remove the finding.
  const { error: issuesError, count: issuesDeleted } = await supabase
    .from("issues")
    .delete({ count: "exact" })
    .eq("provider", "simulated");

  if (issuesError) return { ok: false, error: issuesError.message };

  const { error: auditsError, count: auditsDeleted } = await supabase
    .from("audits")
    .delete({ count: "exact" })
    .eq("provider", "simulated");

  if (auditsError) return { ok: false, error: auditsError.message };

  revalidatePath("/", "layout");
  return {
    ok: true,
    data: { audits: auditsDeleted ?? 0, issues: issuesDeleted ?? 0 },
  };
}
