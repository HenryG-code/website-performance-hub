"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { signIn } from "@/app/actions/auth";
import { safeNextPath } from "@/lib/security/safe-redirect";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import {
  AuthHeading,
  FormError,
  PasswordField,
  SubmitButton,
} from "@/components/auth/auth-form";
import type { ActionResult } from "@/app/actions/types";

const NOTICES: Record<string, string> = {
  "link-invalid":
    "That link has expired or was already used. Request a new one below.",
};

export function SignInForm() {
  const searchParams = useSearchParams();
  const [result, formAction, pending] = useActionState<ActionResult | null, FormData>(
    signIn,
    null,
  );

  // Sanitised here as well as in the action, so an attacker-supplied URL never
  // reaches the DOM at all.
  const next = safeNextPath(searchParams.get("next"));
  const notice = NOTICES[searchParams.get("error") ?? ""];
  const justRegistered = searchParams.get("registered") === "1";

  const errors = result && !result.ok ? (result.errors ?? {}) : {};
  const formError =
    result && !result.ok && !result.errors ? result.error : undefined;

  return (
    <div className="space-y-6">
      <AuthHeading
        title="Sign in"
        description="Welcome back. Enter your details to reach your dashboard."
      />

      {justRegistered ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5">
          <CheckCircle2 className="mt-px size-4 shrink-0 text-success" />
          <p className="text-sm text-success">
            Your email is confirmed. Sign in to continue.
          </p>
        </div>
      ) : null}

      <FormError message={notice ?? formError} />

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />

        <Field label="Email" htmlFor="email" error={errors.email} required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={Boolean(errors.email)}
            autoFocus
          />
        </Field>

        <div className="space-y-1.5">
          <PasswordField
            id="password"
            name="password"
            label="Password"
            error={errors.password}
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-accent transition-colors hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <SubmitButton pending={pending} pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>
    </div>
  );
}
