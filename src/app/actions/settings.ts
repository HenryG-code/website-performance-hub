"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  fieldErrors,
  notificationPreferencesSchema,
  profileSchema,
  reportPreferencesSchema,
} from "@/lib/validation";
import type { ActionResult } from "./types";

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Check the form.", errors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.name,
      role: parsed.data.role,
      company: parsed.data.company,
      timezone: parsed.data.timezone,
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateNotifications(input: unknown): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const parsed = notificationPreferencesSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown preference." };

  const patch = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("report_preferences")
    .update({
      ...(patch.auditCompleted !== undefined && {
        notify_audit_completed: patch.auditCompleted,
      }),
      ...(patch.criticalIssues !== undefined && {
        notify_critical_issues: patch.criticalIssues,
      }),
      ...(patch.auditFailed !== undefined && {
        notify_audit_failed: patch.auditFailed,
      }),
      ...(patch.scoreDrops !== undefined && {
        notify_score_drops: patch.scoreDrops,
      }),
      ...(patch.weeklyDigest !== undefined && {
        notify_weekly_digest: patch.weeklyDigest,
      }),
      ...(patch.productUpdates !== undefined && {
        notify_product_updates: patch.productUpdates,
      }),
    })
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateReportPreferences(
  input: unknown,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const parsed = reportPreferencesSchema.partial().safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Check the form.", errors: fieldErrors(parsed.error) };
  }

  const patch = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("report_preferences")
    .update({
      ...(patch.reportTitle !== undefined && { report_title: patch.reportTitle }),
      ...(patch.brandName !== undefined && { brand_name: patch.brandName }),
      ...(patch.auditFrequency !== undefined && {
        audit_frequency: patch.auditFrequency,
      }),
      ...(patch.defaultDevice !== undefined && {
        default_device: patch.defaultDevice,
      }),
      ...(patch.scoreThreshold !== undefined && {
        score_threshold: patch.scoreThreshold,
      }),
    })
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
