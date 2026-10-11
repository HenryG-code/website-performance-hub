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
 * Shared by the Next application and the uptime worker. Keep these structural
 * checks pure and dependency-free; each caller handles DNS at its boundary.
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

export function isIpv4(host: string): boolean {
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
  if (a === 192 && b === 2) return true; // documentation
  if (a === 198 && b === 51 && octets[2] === 100) return true;
  if (a === 203 && b === 0 && octets[2] === 113) return true;
  if (a >= 224) return true; // multicast + reserved + broadcast

  return false;
}

/** True for IPv6 loopback, unique-local, link-local and IPv4-mapped privates. */
export function isPrivateIpv6(host: string): boolean {
  const address = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!address.includes(":")) return false;
  let canonical: string;
  try {
    canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  } catch {
    return true;
  }
  const [left, right] = canonical.split("::");
  const head = left ? left.split(":") : [];
  const tail = right ? right.split(":") : [];
  const groups = canonical.includes("::")
    ? [...head, ...Array(8 - head.length - tail.length).fill("0"), ...tail]
    : head;
  const words = groups.map((part) => parseInt(part, 16));
  if (words.length !== 8 || words.some(Number.isNaN)) return true;
  // URL canonicalisation converts dotted IPv4 tails to hexadecimal.
  if (words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff) {
    return isPrivateIpv4(
      `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`,
    );
  }
  // Allow global unicast only: local, multicast, IPv4-compatible and NAT64
  // addresses must never be used by the worker.
  if ((words[0] & 0xe000) !== 0x2000) return true;
  if (words[0] === 0x2002) return true; // 6to4 embeds an IPv4 destination
  if (words[0] === 0x2001 && words[1] < 0x200) return true; // special-use
  return words[0] === 0x2001 && words[1] === 0x0db8; // documentation
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
