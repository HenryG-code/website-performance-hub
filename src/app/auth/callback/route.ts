import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/security/safe-redirect";
import { authRedirectOrigin } from "@/lib/supabase/request-origin";

/**
 * Landing point for every link Supabase emails out — confirmation and password
 * recovery alike.
 *
 * Two link shapes are handled because which one arrives depends on the email
 * template: the default templates produce a `code` (PKCE), while templates
 * customised to use `{{ .TokenHash }}` produce `token_hash` + `type`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = await authRedirectOrigin();

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/sign-in?error=link-invalid", origin));
}
