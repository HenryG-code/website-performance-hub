"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import {
  AuthHeading,
  FormError,
  SubmitButton,
} from "@/components/auth/auth-form";
import type { ActionResult } from "@/app/actions/types";

export function ForgotPasswordForm() {
  const [result, formAction, pending] = useActionState<ActionResult | null, FormData>(
    requestPasswordReset,
    null,
  );

  // The action reports success for unknown addresses too, so this screen never
  // reveals whether an email is registered.
  if (result?.ok) {
    return (
      <div className="space-y-4">
        <div className="flex size-11 items-center justify-center rounded-xl border border-success/30 bg-success/10">
          <MailCheck className="size-5 text-success" />
        </div>
        <AuthHeading
          title="Check your inbox"
          description="If that email has an account, we've sent a link to reset the password. It expires in one hour."
        />
        <p className="text-xs leading-relaxed text-subtle-foreground">
          Nothing arriving? Check your spam folder, then try again in a few
          minutes.
        </p>
      </div>
    );
  }

  const errors = result && !result.ok ? (result.errors ?? {}) : {};
  const formError =
    result && !result.ok && !result.errors ? result.error : undefined;

  return (
    <div className="space-y-6">
      <AuthHeading
        title="Reset your password"
        description="Enter the email you signed up with and we'll send a link to choose a new password."
      />

      <FormError message={formError} />

      <form action={formAction} className="space-y-4" noValidate>
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

        <SubmitButton pending={pending} pendingLabel="Sending link…">
          Send reset link
        </SubmitButton>
      </form>
    </div>
  );
}
