import "server-only";

import { headers } from "next/headers";
import { siteUrl } from "./env";

/**
 * The origin to build emailed auth links from.
 *
 * Derived from the incoming request rather than `NEXT_PUBLIC_SITE_URL`, because
 * a hand-typed environment variable is a single point of failure for the one
 * flow nobody can work around: a typo in it sends every password-reset and
 * confirmation link to a domain that does not exist, and the only people
 * affected are the ones who cannot get in to report it. That is exactly what
 * happened here — the variable read `webletics` instead of `weblytics`.
 *
 * Using the request origin also means preview deployments email links back to
 * themselves instead of to production.
 *
 * On the host header being trustworthy: Vercel only routes a request to this
 * project when the Host matches a domain assigned to it, so the value cannot be
 * forged in this deployment. Supabase is the second gate regardless — it
 * refuses any `redirect_to` that is not on the project's allow-list, so a
 * poisoned host cannot turn into a working reset link pointed at an attacker.
 */
export async function authRedirectOrigin(): Promise<string> {
  try {
    const requestHeaders = await headers();

    // `x-forwarded-host` is what a proxy rewrites to; `host` is the direct case.
    const host =
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

    if (host) {
      // A comma-separated chain can appear behind multiple proxies; the first
      // entry is the origin-facing host.
      const firstHost = host.split(",")[0].trim();

      // Local development is the only case that is legitimately not HTTPS.
      const isLocal =
        firstHost.startsWith("localhost") || firstHost.startsWith("127.0.0.1");

      const forwardedProto = requestHeaders
        .get("x-forwarded-proto")
        ?.split(",")[0]
        .trim();

      const protocol = forwardedProto ?? (isLocal ? "http" : "https");

      if (firstHost.length > 0 && !firstHost.includes("/")) {
        return `${protocol}://${firstHost}`;
      }
    }
  } catch {
    // `headers()` throws outside a request scope. Fall through to the
    // configured value so nothing depends on this succeeding.
  }

  return siteUrl();
}
