/**
 * Server-Side Request Forgery guard for audit targets.
 *
 * The audit endpoint takes a URL from a signed-in user and hands it to Google.
 * Google does the fetching, not us, so the classic "make our server request an
 * internal host" attack does not apply directly — but the same URL is stored,
 * displayed, and followed by our own reachability pre-check, and a private or
 * metadata address is never a legitimate audit target. Rejecting them up front
 * keeps internal hostnames out of the database and out of other users' view.
 *
 * This module is pure and synchronous apart from `assertPublicUrl`, which does
 * DNS resolution. Keep it dependency-free so it stays trivially testable.
 */

export type UrlRejectionReason =
  | "empty"
  | "malformed"
  | "unsupported-scheme"
  | "credentials-in-url"
  | "missing-hostname"
  | "not-a-public-hostname"
  | "blocked-host"
  | "private-address"
  | "too-long";

export interface UrlCheckResult {
  ok: boolean;
  reason?: UrlRejectionReason;
  message?: string;
  /** Normalised absolute URL, present when `ok` is true. */
  url?: string;
}

const MAX_URL_LENGTH = 2048;

/** Hostnames that always refer to the local machine, whatever DNS says. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
]);

/**
 * Suffixes that resolve only inside a private network. `.local` is mDNS,
 * the rest are conventional internal TLDs.
 */
const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".private",
  ".corp",
  ".home",
  ".lan",
];

/**
 * Cloud instance-metadata endpoints. These serve credentials to anything that
 * can reach them, so they are the highest-value SSRF target there is.
 */
const METADATA_HOSTS = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "100.100.100.200", // Alibaba Cloud
  "192.0.0.192", // Oracle Cloud
]);

function isIpv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/** Expands the shorthand forms Node's URL parser leaves intact. */
function ipv4Octets(host: string): number[] | null {
  if (!isIpv4(host)) return null;
  const parts = host.split(".").map(Number);
  if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null;
  }
  return parts;
}

/**
 * True for any IPv4 address that is not routable on the public internet.
 * Covers RFC 1918 private space, loopback, link-local (which includes the
 * cloud metadata range), CGNAT, benchmarking, multicast and reserved space.
 */
export function isPrivateIpv4(host: string): boolean {
  const octets = ipv4Octets(host);
  if (!octets) return false;

  const [a, b] = octets;

  if (a === 0) return true; // "this" network
  if (a === 10) return true; // RFC 1918
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC 1918
  if (a === 192 && b === 0) return true; // IETF protocol assignments
  if (a === 192 && b === 168) return true; // RFC 1918
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved + broadcast

  return false;
}

/** True for IPv6 loopback, unique-local, link-local and IPv4-mapped privates. */
export function isPrivateIpv6(host: string): boolean {
  const address = host.replace(/^\[|\]$/g, "").toLowerCase().split("%")[0];

  if (address === "::" || address === "::1") return true;
  if (address.startsWith("fc") || address.startsWith("fd")) return true; // unique-local
  if (address.startsWith("fe8") || address.startsWith("fe9")) return true; // link-local
  if (address.startsWith("fea") || address.startsWith("feb")) return true;
  if (address.startsWith("ff")) return true; // multicast

  // ::ffff:10.0.0.1 style IPv4-mapped addresses.
  const mapped = address.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateIpv4(mapped[1]);

  return false;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");

  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (METADATA_HOSTS.has(host)) return true;
  if (BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;

  return false;
}

/**
 * Structural validation: scheme, shape, and obviously non-public hosts.
 *
 * Deliberately separate from DNS resolution so it can run anywhere — including
 * in the browser for instant form feedback — and be tested without a network.
 */
export function checkAuditUrl(rawUrl: string): UrlCheckResult {
  const trimmed = (rawUrl ?? "").trim();

  if (!trimmed) {
    return { ok: false, reason: "empty", message: "Enter a URL to audit." };
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      ok: false,
      reason: "too-long",
      message: `URLs must be under ${MAX_URL_LENGTH} characters.`,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      reason: "malformed",
      message: "That doesn't look like a valid URL.",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      reason: "unsupported-scheme",
      message: "Only http:// and https:// URLs can be audited.",
    };
  }

  // user:pass@host would be stored and displayed; refuse it outright.
  if (parsed.username || parsed.password) {
    return {
      ok: false,
      reason: "credentials-in-url",
      message: "Remove the username and password from the URL.",
    };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");

  if (!hostname) {
    return {
      ok: false,
      reason: "missing-hostname",
      message: "That URL has no hostname.",
    };
  }

  if (isBlockedHostname(hostname)) {
    return {
      ok: false,
      reason: "blocked-host",
      message: "Local and internal addresses cannot be audited.",
    };
  }

  if (isPrivateIpv4(hostname) || isPrivateIpv6(hostname)) {
    return {
      ok: false,
      reason: "private-address",
      message: "Private and loopback addresses cannot be audited.",
    };
  }

  // A bare IP that survived the private checks is public, and allowed.
  // Anything else must look like a real hostname with a dot in it.
  const looksLikeIp = isIpv4(hostname) || hostname.includes(":");
  if (!looksLikeIp && !hostname.includes(".")) {
    return {
      ok: false,
      reason: "not-a-public-hostname",
      message: "Enter a full public domain, for example example.com.",
    };
  }

  return { ok: true, url: parsed.toString() };
}

/**
 * Full check including DNS. Every resolved address must be public — a hostname
 * that looks fine but resolves to 127.0.0.1 (DNS rebinding) is rejected here.
 *
 * Import lazily so this module stays usable from client code.
 */
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
