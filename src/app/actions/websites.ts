"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { fieldErrors, websiteInputSchema } from "@/lib/validation";
import type { ActionResult } from "./types";

/** Adds the scheme when the user omitted it, and drops a trailing slash. */
function normaliseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function createWebsite(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  // Re-validated here even though the dialog already checked: the client
  // schema is a convenience, this one is the guarantee.
  const parsed = websiteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Check the form.", errors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("websites")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      url: normaliseUrl(parsed.data.url),
      team: parsed.data.team || "Unassigned",
      environment: parsed.data.environment,
      tags: parsed.data.tags,
      status: "paused",
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation, from the (owner_id, url) constraint.
    if (error.code === "23505") {
      return {
        ok: false,
        error: "That website is already being monitored.",
        errors: { url: "That website is already being monitored." },
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { id: data.id } };
}

export async function updateWebsite(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const parsed = websiteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Check the form.", errors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  // No owner_id filter: RLS restricts the update to rows this user owns, so a
  // forged id simply matches nothing.
  const { error, count } = await supabase
    .from("websites")
    .update(
      {
        name: parsed.data.name,
        url: normaliseUrl(parsed.data.url),
        team: parsed.data.team || "Unassigned",
        environment: parsed.data.environment,
        tags: parsed.data.tags,
      },
      { count: "exact" },
    )
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Another website already uses that URL.",
        errors: { url: "Another website already uses that URL." },
      };
    }
    return { ok: false, error: error.message };
  }

  if (count === 0) return { ok: false, error: "That website no longer exists." };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteWebsite(id: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const supabase = await createClient();
  // Audits and issues go with it via `on delete cascade`.
  const { error } = await supabase.from("websites").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
