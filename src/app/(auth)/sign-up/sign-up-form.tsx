"use client";

import { useActionState } from "react";
import { signUp } from "@/app/actions/auth";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import {
  AuthHeading,
  FormError,
  PasswordField,
  SubmitButton,
} from "@/components/auth/auth-form";
import type { ActionResult } from "@/app/actions/types";

export function SignUpForm() {
  const [result, formAction, pending] = useActionState<ActionResult | null, FormData>(
    signUp,
    null,
  );

  const errors = result && !result.ok ? (result.errors ?? {}) : {};
  const formError =
    result && !result.ok && !result.errors ? result.error : undefined;

  return (
    <div className="space-y-6">
      <AuthHeading
        title="Create your account"
        description="Start monitoring your first website in under a minute. No card required."
      />

      <FormError message={formError} />

      <form action={formAction} className="space-y-4" noValidate>
        <Field label="Full name" htmlFor="fullName" error={errors.fullName} required>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            placeholder="Alex Rivera"
            aria-invalid={Boolean(errors.fullName)}
            inputSize="lg"
            autoFocus
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email} required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={Boolean(errors.email)}
            inputSize="lg"
          />
        </Field>

        <PasswordField
          id="password"
          name="password"
          label="Password"
          error={errors.password}
          hint="At least 8 characters."
          autoComplete="new-password"
        />

        <SubmitButton pending={pending} pendingLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>

      <p className="text-xs leading-relaxed text-subtle-foreground">
        Your websites, audits and issues are private to your account.
      </p>
    </div>
  );
}
