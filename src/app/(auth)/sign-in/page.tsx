import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="h-96" aria-hidden />}>
        <SignInForm />
      </Suspense>

      <p className="text-center text-sm text-muted-foreground">
        New to PerformanceHub?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-accent transition-colors hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
