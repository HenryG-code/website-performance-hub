"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/actions/auth";
import {
  AuthHeading,
  FormError,
  PasswordField,
  SubmitButton,
} from "@/components/auth/auth-form";
import type { ActionResult } from "@/app/actions/types";

export function ResetPasswordForm({ email }: { email: string }) {
  const [result, formAction, pending] = useActionState<ActionResult | null, FormData>(
    updatePassword,
    null,
  );

  const errors = result && !result.ok ? (result.errors ?? {}) : {};
  const formError =
    result && !result.ok && !result.errors ? result.error : undefined;

  return (
    <div className="space-y-6">
      <AuthHeading
        title="Choose a new password"
        description={
          <>
            Setting a new password for{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </>
        }
      />

      <FormError message={formError} />

      <form action={formAction} className="space-y-4" noValidate>
        <PasswordField
          id="password"
          name="password"
          label="New password"
          error={errors.password}
          hint="At least 8 characters."
          autoComplete="new-password"
        />

        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm new password"
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <SubmitButton pending={pending} pendingLabel="Updating…">
          Update password
        </SubmitButton>
      </form>
    </div>
  );
}
