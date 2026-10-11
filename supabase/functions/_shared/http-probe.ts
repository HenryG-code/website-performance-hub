import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { request as httpRequest, type ClientRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest, type RequestOptions } from "node:https";
import { isIP } from "node:net";
import { checkAuditUrl, isPrivateIpv4, isPrivateIpv6 } from "./url-guard.ts";

export type CheckResult = {
  statusCode: number | null;
  responseMs: number | null;
  error: string | null;
};

type RequestImpl = (
  options: RequestOptions,
  callback: (response: IncomingMessage) => void,
) => ClientRequest;

type ProbeDependencies = {
  resolve?: (hostname: string) => Promise<LookupAddress[]>;
  request?: RequestImpl;
};

function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4 ? !isPrivateIpv4(address) : family === 6 && !isPrivateIpv6(address);
}

/**
 * Revalidate the current target on EVERY probe, including direct database
 * edits. Connect to a validated numeric IP so a second DNS lookup cannot
 * rebind to an internal destination. Host and TLS SNI retain the site name;
 * certificate verification stays enabled. Node requests never follow redirects.
 */
export async function checkTarget(
  monitor: { target_url: string; timeout_ms: number },
  dependencies: ProbeDependencies = {},
): Promise<CheckResult> {
  const guard = checkAuditUrl(monitor.target_url);
  const unsafe = { statusCode: null, responseMs: null, error: "Unsafe monitor URL." };
  if (!guard.ok) return unsafe;
  const url = new URL(guard.url!);
  if (url.port && url.port !== "80" && url.port !== "443") return unsafe;
  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const timeout = Math.min(Math.max(monitor.timeout_ms, 1000), 30_000);
  const signal = AbortSignal.timeout(timeout);
  const started = performance.now();
  const resolveDns = dependencies.resolve ?? ((host) => lookup(host, { all: true }));

  try {
    let removeAbort = () => {};
    const aborted = new Promise<never>((_, reject) => {
      const onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
      removeAbort = () => signal.removeEventListener("abort", onAbort);
    });
    let addresses: LookupAddress[];
    try {
      addresses = isIP(hostname)
        ? [{ address: hostname, family: isIP(hostname) }]
        : await Promise.race([resolveDns(hostname), aborted]);
    } finally {
      removeAbort();
    }
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
      return unsafe;
    }
    signal.throwIfAborted();
    const target = addresses.find(({ address }) => isIP(address) === 4) ?? addresses[0];
    const request = dependencies.request ?? (url.protocol === "https:" ? httpsRequest : httpRequest);
    const statusCode = await new Promise<number>((resolve, reject) => {
      const req = request({
        protocol: url.protocol,
        hostname: target.address,
        family: isIP(target.address),
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        servername: isIP(hostname) ? undefined : hostname,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        agent: false,
        signal,
        maxHeaderSize: 16_384,
        headers: {
          Host: url.host,
          "User-Agent": "PerformanceHub-Uptime/1.0",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        },
      }, (response) => {
        // Status is enough. Close the connection without retaining a body.
        const status = response.statusCode;
        response.destroy();
        if (status === undefined) reject(new Error("Missing status."));
        else resolve(status);
      });
      req.on("error", reject);
      req.end();
    });
    return { statusCode, responseMs: Math.round(performance.now() - started), error: null };
  } catch {
    return {
      statusCode: null,
      responseMs: null,
      error: signal.aborted ? "Request timed out." : "Network request failed.",
    };
  }
}
