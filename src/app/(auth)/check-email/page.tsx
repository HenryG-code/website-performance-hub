import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex size-11 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
        <MailCheck className="size-5 text-accent" />
      </div>

      <AuthHeading
        title="Confirm your email"
        description={
          email ? (
            <>
              We&apos;ve sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{email}</span>. Open
              it to activate your account.
            </>
          ) : (
            "We've sent you a confirmation link. Open it to activate your account."
          )
        }
      />

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          The link signs you straight in. If it hasn&apos;t arrived within a few
          minutes, check your spam folder — or sign up again to have another one
          sent.
        </p>
      </div>

      <p className="text-center text-sm">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
