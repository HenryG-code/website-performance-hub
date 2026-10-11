import "server-only";

import { headers } from "next/headers";
import { siteUrl } from "./env";

const PRODUCTION_ORIGIN = "https://performancehub.weblytics.co.za";

/** Accept exact origins only, with HTTPS except for loopback development. */
function validatedOrigin(value: string | undefined): string | null {
  if (!value || /[\\\s,@]/.test(value)) return null;
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (url.protocol !== "https:" && !(local && url.protocol === "http:" && process.env.NODE_ENV !== "production")) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Request headers select among server-configured origins, never define trust.
 * The known production origin keeps reset links working even if SITE_URL has
 * a typo; other custom domains must be listed in AUTH_ALLOWED_ORIGINS.
 */
export async function authRedirectOrigin(): Promise<string> {
  const configured = validatedOrigin(siteUrl());
  const deploymentOrigins = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].map((host) => validatedOrigin(host ? `https://${host}` : undefined));
  const explicitOrigins = (process.env.AUTH_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => validatedOrigin(value.trim()));
  const allowed = new Set([
    PRODUCTION_ORIGIN,
    configured,
    ...deploymentOrigins,
    ...explicitOrigins,
  ].filter((value): value is string => value !== null));

  try {
    const requestHeaders = await headers();
    for (const host of [requestHeaders.get("x-forwarded-host"), requestHeaders.get("host")]) {
      if (!host || /[\\\s,/@?#]/.test(host)) continue;
      // Ignore x-forwarded-proto: it must never downgrade production auth links.
      const secure = validatedOrigin(`https://${host}`);
      if (secure && allowed.has(secure)) return secure;
      if (process.env.NODE_ENV !== "production") {
        const local = validatedOrigin(`http://${host}`);
        if (local && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(local).hostname)) {
          return local;
        }
      }
    }
  } catch {
    // headers() is unavailable outside a request.
  }
  return configured ?? deploymentOrigins.find((value) => value !== null) ?? PRODUCTION_ORIGIN;
}
