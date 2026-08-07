import "server-only";

import type { PsiResponse, PsiStrategy } from "./types";

/**
 * PageSpeed Insights API client.
 *
 * `server-only` guarantees this module — and therefore the API key — can never
 * be pulled into a client bundle. The key is read from a non-`NEXT_PUBLIC_`
 * variable, so Next has no mechanism to inline it into browser JavaScript even
 * if something did import it.
 */

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/**
 * A cold Lighthouse run on a slow origin genuinely can take ~60s. The ceiling
 * is generous but finite, so a hung request cannot pin a serverless invocation
 * open indefinitely.
 */
const REQUEST_TIMEOUT_MS = 90_000;

/** Categories requested on every run — all four the dashboard displays. */
const CATEGORIES = ["performance", "accessibility", "seo", "best-practices"];

export type PsiErrorCode =
  | "missing-api-key"
  | "invalid-api-key"
  | "quota-exceeded"
  | "rate-limited"
  | "target-unreachable"
  | "lighthouse-error"
  | "timeout"
  | "network-error"
  | "bad-response"
  | "unknown";

export class PageSpeedError extends Error {
  readonly code: PsiErrorCode;
  readonly httpStatus?: number;
  /** Safe to show a user; never contains the API key or internal detail. */
  readonly userMessage: string;

  constructor(
    code: PsiErrorCode,
    userMessage: string,
    options?: { httpStatus?: number; cause?: unknown },
  ) {
    super(userMessage, { cause: options?.cause });
    this.name = "PageSpeedError";
    this.code = code;
    this.userMessage = userMessage;
    this.httpStatus = options?.httpStatus;
  }
}

export function hasApiKey(): boolean {
  return Boolean(process.env.PAGESPEED_API_KEY?.trim());
}

/**
 * Maps a Google error response onto an actionable message.
 *
 * Google's raw text is written for API developers ("Quota exceeded for quota
 * metric 'Queries'…"), so it is translated rather than passed through.
 */
function classify(status: number, body: unknown): PageSpeedError {
  const message =
    typeof body === "object" && body !== null
      ? String(
          (body as { error?: { message?: string } }).error?.message ?? "",
        ).toLowerCase()
      : "";

  if (status === 400 && message.includes("api key")) {
    return new PageSpeedError(
      "invalid-api-key",
      "The PageSpeed API key was rejected. Check PAGESPEED_API_KEY.",
      { httpStatus: status },
    );
  }

  if (status === 400 || status === 422) {
    return new PageSpeedError(
      "target-unreachable",
      "Google could not load that URL. Check the site is publicly reachable and try again.",
      { httpStatus: status },
    );
  }

  if (status === 403) {
    return new PageSpeedError(
      message.includes("quota") ? "quota-exceeded" : "invalid-api-key",
      message.includes("quota")
        ? "The daily PageSpeed quota has been used up. It resets at midnight Pacific time."
        : "The PageSpeed API key was rejected or the API is not enabled for this project.",
      { httpStatus: status },
    );
  }

  if (status === 429) {
    return new PageSpeedError(
      "quota-exceeded",
      "PageSpeed rate limit reached. Wait a minute and try again, or add an API key to raise the quota.",
      { httpStatus: status },
    );
  }

  if (status >= 500) {
    return new PageSpeedError(
      "network-error",
      "Google's PageSpeed service is having trouble. Try again shortly.",
      { httpStatus: status },
    );
  }

  return new PageSpeedError(
    "unknown",
    "The PageSpeed service returned an unexpected error.",
    { httpStatus: status },
  );
}

export interface RunPageSpeedOptions {
  url: string;
  strategy: PsiStrategy;
  /** Overridable so tests can inject a stub instead of hitting the network. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Runs one PageSpeed analysis and returns the raw response.
 *
 * Throws `PageSpeedError` for anything that went wrong, so the caller has a
 * single, typed failure shape to record against the audit row.
 */
export async function runPageSpeed({
  url,
  strategy,
  fetchImpl = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
}: RunPageSpeedOptions): Promise<PsiResponse> {
  const apiKey = process.env.PAGESPEED_API_KEY?.trim();

  const endpoint = new URL(ENDPOINT);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  for (const category of CATEGORIES) {
    endpoint.searchParams.append("category", category);
  }
  if (apiKey) endpoint.searchParams.set("key", apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(endpoint.toString(), {
      signal: controller.signal,
      headers: { accept: "application/json" },
      cache: "no-store",
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new PageSpeedError(
        "timeout",
        `The audit took longer than ${Math.round(timeoutMs / 1000)}s and was stopped. Slow sites sometimes need a second attempt.`,
        { cause },
      );
    }
    throw new PageSpeedError(
      "network-error",
      "Could not reach the PageSpeed service. Check your connection and try again.",
      { cause },
    );
  } finally {
    clearTimeout(timer);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    throw new PageSpeedError(
      "bad-response",
      "The PageSpeed service returned a response we could not read.",
      { httpStatus: response.status, cause },
    );
  }

  if (!response.ok) throw classify(response.status, body);

  const psi = body as PsiResponse;

  // A 200 can still carry a Lighthouse runtime error — for example the page
  // refused to load, or redirected somewhere that timed out.
  const runtimeError = psi.lighthouseResult?.runtimeError;
  if (runtimeError?.code && runtimeError.code !== "NO_ERROR") {
    throw new PageSpeedError(
      "lighthouse-error",
      runtimeError.message
        ? `Lighthouse could not analyse the page: ${runtimeError.message}`
        : "Lighthouse could not analyse the page.",
      { httpStatus: response.status },
    );
  }

  if (!psi.lighthouseResult?.categories) {
    throw new PageSpeedError(
      "bad-response",
      "The PageSpeed response contained no Lighthouse results.",
      { httpStatus: response.status },
    );
  }

  return psi;
}
