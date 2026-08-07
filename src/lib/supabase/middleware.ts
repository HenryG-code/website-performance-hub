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
  "/auth", // callback + confirm + sign-out route handlers
];

/**
 * Metadata routes Next generates from `app/`.
 *
 * These are fetched by clients that can never have a session — link unfurlers
 * reading the Open Graph card, iOS grabbing the touch icon, the browser
 * loading the web manifest. Gating them behind auth makes every shared link
 * render without a preview and the installed app show a blank icon.
 *
 * They expose nothing private: all three are generated from static brand
 * assets, not from any user's data.
 */
const PUBLIC_METADATA_ROUTES = new Set([
  "/manifest.webmanifest",
  "/opengraph-image",
  "/twitter-image",
  "/apple-icon",
  "/icon",
  "/robots.txt",
  "/sitemap.xml",
]);

/**
 * Whether a path may be served without a session.
 *
 * Exported so the classification is covered by tests: getting it wrong in
 * either direction is serious — too narrow and shared links lose their preview,
 * too wide and a private route leaks.
 */
export function isPublic(pathname: string): boolean {
  if (PUBLIC_METADATA_ROUTES.has(pathname)) return true;

  // Generated icon routes can carry a cache-busting suffix, e.g. `/icon/route`
  // or `/apple-icon/opengraph-image-abc123`.
  if (/^\/(icon|apple-icon|opengraph-image|twitter-image)([/-]|$)/.test(pathname)) {
    return true;
  }

  /*
    Matched on whole path segments. A bare `startsWith` would make any future
    route whose name merely begins with a public one — `/sign-in-report`, say —
    silently reachable without a session.
  */
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
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
