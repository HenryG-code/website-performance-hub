import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Routes reachable without a session. Everything else requires sign-in. */
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/check-email",
  "/auth/", // callback + confirm + sign-out route handlers
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

/**
 * Refreshes the auth session on every request and gates protected routes.
 *
 * Two rules matter here and are easy to get wrong:
 *
 * 1. The `supabaseResponse` object must be returned as-is. Creating a fresh
 *    `NextResponse` would drop the refreshed auth cookies and log the user out
 *    at random.
 * 2. `getUser()` must be called before any redirect decision — it revalidates
 *    the token rather than trusting the cookie's contents.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.search = "";
    // Preserve where they were headed so sign-in can send them back.
    const intended = `${pathname}${search}`;
    if (intended !== "/") redirectUrl.searchParams.set("next", intended);
    return NextResponse.redirect(redirectUrl);
  }

  // A signed-in user has no business on the sign-in or sign-up screens.
  // `/reset-password` is deliberately excluded: completing a recovery link
  // signs the user in first, then requires them to set a new password.
  if (user && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
