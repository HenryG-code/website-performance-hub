import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AuthHeading } from "@/components/auth/auth-form";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

/**
 * Reached by following a recovery link, which signs the user in first. Landing
 * here without a session means the link expired or was already used — say so
 * plainly rather than showing a form that cannot work.
 */
export default async function ResetPasswordPage() {
  const user = await getUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex size-11 items-center justify-center rounded-xl border border-warning/30 bg-warning/10">
          <KeyRound className="size-5 text-warning" />
        </div>
        <AuthHeading
          title="This link has expired"
          description="Password reset links can only be used once, and expire an hour after they're sent."
        />
        <Button asChild size="lg" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return <ResetPasswordForm email={user.email ?? ""} />;
}
