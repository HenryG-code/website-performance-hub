"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { authRedirectOrigin } from "@/lib/supabase/request-origin";
import { safeNextPath } from "@/lib/security/safe-redirect";
import {
  fieldErrors,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";
import type { ActionResult } from "./types";


export async function signIn(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Check the form.", errors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Deliberately vague: distinguishing "no such account" from "wrong
    // password" tells an attacker which emails are registered.
    return { ok: false, error: "That email and password combination isn't right." };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next") as string | null));
}

export async function signUp(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Check the form.", errors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the `handle_new_user` trigger to seed the profile row.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await authRedirectOrigin()}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return {
        ok: false,
        error: "An account with that email already exists. Try signing in.",
        errors: { email: "An account with that email already exists." },
      };
    }
    return { ok: false, error: error.message };
  }

  // With email confirmation on, sign-up returns a user but no session.
  if (!data.session) {
    redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordReset(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { ok: false, error: "Check the form.", errors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await authRedirectOrigin()}/auth/callback?next=/reset-password`,
  });

  // Always reports success, even for an unknown address — otherwise this form
  // becomes a way to enumerate which emails have accounts.
  return { ok: true };
}

export async function updatePassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { ok: false, error: "Check the form.", errors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();

  // The recovery link signs the user in before they land here; without a
  // session there is nothing to update, and no way to prove who they are.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "That reset link has expired. Request a new one to continue.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  redirect("/?password-updated=1");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
}
