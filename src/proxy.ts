import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Runs before every matched request: refreshes the Supabase session and
 * redirects unauthenticated traffic to sign-in.
 *
 * Next 16 renamed this convention from `middleware` to `proxy`; the behaviour
 * is unchanged.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Every path except static assets and image files. Everything that renders
     * UI or handles auth passes through here, so there is no route reachable
     * with a stale or missing session check.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
