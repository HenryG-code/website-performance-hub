"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { issueStatusSchema } from "@/lib/validation";
import type { ActionResult } from "./types";

export async function setIssueStatus(
  issueId: string,
  status: unknown,
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: "You need to be signed in." };

  const parsed = issueStatusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Unknown issue status." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("issues")
    .update({ status: parsed.data }, { count: "exact" })
    .eq("id", issueId);

  if (error) return { ok: false, error: error.message };
  if (count === 0) return { ok: false, error: "That issue no longer exists." };

  revalidatePath("/", "layout");
  return { ok: true };
}
