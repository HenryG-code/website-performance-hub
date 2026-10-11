import {
  checkAuditUrl,
  isIpv4,
  isPrivateIpv4,
  isPrivateIpv6,
  type UrlCheckResult,
} from "../../../supabase/functions/_shared/url-guard";

export {
  checkAuditUrl,
  isBlockedHostname,
  isPrivateIpv4,
  isPrivateIpv6,
  type UrlCheckResult,
  type UrlRejectionReason,
} from "../../../supabase/functions/_shared/url-guard";

/** Validate DNS immediately before an audit or enabling a monitor. */
export async function assertPublicUrl(rawUrl: string): Promise<UrlCheckResult> {
  const structural = checkAuditUrl(rawUrl);
  if (!structural.ok) return structural;

  const hostname = new URL(structural.url!).hostname
    .toLowerCase()
    .replace(/\.$/, "");

  // A literal IP has already been range-checked; no lookup to do.
  if (isIpv4(hostname) || hostname.includes(":")) return structural;

  try {
    const { lookup } = await import("node:dns/promises");
    const addresses = await lookup(hostname, { all: true });

    if (addresses.length === 0) {
      return {
        ok: false,
        reason: "not-a-public-hostname",
        message: "That domain could not be resolved.",
      };
    }

    for (const { address, family } of addresses) {
      const isPrivate =
        family === 4 ? isPrivateIpv4(address) : isPrivateIpv6(address);
      if (isPrivate) {
        return {
          ok: false,
          reason: "private-address",
          message: "That domain resolves to a private address.",
        };
      }
    }
  } catch {
    return {
      ok: false,
      reason: "not-a-public-hostname",
      message: "That domain could not be resolved.",
    };
  }

  return structural;
}
