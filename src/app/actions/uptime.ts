"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getUser } from "@/lib/supabase/server";
import { assertPublicUrl } from "@/lib/security/url-guard";
import type { ActionResult } from "./types";

const monitorInputSchema = z.object({
  websiteId: z.string().uuid(),
  enabled: z.boolean(),
});

/**
 * Enables or pauses the one uptime monitor associated with a website.
 *
 * Availability is a server-side network operation, so re-checking the target
 * with the same public-URL guard used by PageSpeed prevents an account from
 * turning the scheduled worker into an internal-network probe.
 */
export async function setUptimeMonitoring(
  input: unknown,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const parsed = monitorInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid monitor request." };

  const supabase = await createClient();
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id, url")
    .eq("id", parsed.data.websiteId)
    .maybeSingle();

  if (websiteError) return { ok: false, error: websiteError.message };
  if (!website) return { ok: false, error: "That website is not in your account." };

  if (parsed.data.enabled) {
    const guard = await assertPublicUrl(website.url);
    if (!guard.ok) {
      return {
        ok: false,
        error: guard.message ?? "That URL cannot be monitored.",
      };
    }
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("uptime_monitors").upsert(
    {
      website_id: website.id,
      owner_id: user.id,
      enabled: parsed.data.enabled,
      state: parsed.data.enabled ? "pending" : "paused",
      next_check_at: parsed.data.enabled ? now : null,
      consecutive_failures: 0,
      last_error: null,
    },
    { onConflict: "website_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
