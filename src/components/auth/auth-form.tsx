"use client";

import * as React from "react";
import { Eye, EyeOff, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground text-balance">
        {description}
      </p>
    </div>
  );
}

/** Form-level error banner, distinct from the per-field messages. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5"
    >
      <TriangleAlert className="mt-px size-4 shrink-0 text-danger" />
      <p className="text-sm text-danger">{message}</p>
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingLabel,
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel: string;
}) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}

/**
 * Password input with a show/hide toggle.
 *
 * `autoComplete` is passed in rather than hard-coded: browsers and password
 * managers need "current-password" when signing in and "new-password" when
 * choosing one, and getting it wrong makes them offer the wrong thing.
 */
export function PasswordField({
  id,
  name,
  label,
  error,
  hint,
  autoComplete,
  required = true,
}: {
  id: string;
  name: string;
  label: string;
  error?: string;
  hint?: string;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
}) {
  const [visible, setVisible] = React.useState(false);

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} required={required}>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          className={cn("pr-10")}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-subtle-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </Field>
  );
}
