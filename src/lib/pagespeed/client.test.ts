import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageSpeedError, hasApiKey, runPageSpeed } from "./client";
import { psiWithFieldData } from "./__fixtures__/psi-response";

const ORIGINAL_KEY = process.env.PAGESPEED_API_KEY;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.PAGESPEED_API_KEY = "test-key";
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.PAGESPEED_API_KEY;
  else process.env.PAGESPEED_API_KEY = ORIGINAL_KEY;
});

describe("hasApiKey", () => {
  it("is false for an unset or blank key", () => {
    delete process.env.PAGESPEED_API_KEY;
    expect(hasApiKey()).toBe(false);

    process.env.PAGESPEED_API_KEY = "   ";
    expect(hasApiKey()).toBe(false);
  });

  it("is true once a key is set", () => {
    expect(hasApiKey()).toBe(true);
  });
});

describe("runPageSpeed request", () => {
  it("requests all four categories for the chosen strategy", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(psiWithFieldData));

    await runPageSpeed({
      url: "https://weblytics.co.za/",
      strategy: "desktop",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const requested = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(requested.origin + requested.pathname).toBe(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
    );
    expect(requested.searchParams.get("url")).toBe("https://weblytics.co.za/");
    expect(requested.searchParams.get("strategy")).toBe("desktop");
    expect(requested.searchParams.getAll("category").sort()).toEqual([
      "accessibility",
      "best-practices",
      "performance",
      "seo",
    ]);
  });

  it("sends the API key from the environment", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(psiWithFieldData));

    await runPageSpeed({
      url: "https://example.com",
      strategy: "mobile",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const requested = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(requested.searchParams.get("key")).toBe("test-key");
  });

  it("omits the key parameter entirely when none is configured", async () => {
    delete process.env.PAGESPEED_API_KEY;
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(psiWithFieldData));

    await runPageSpeed({
      url: "https://example.com",
      strategy: "mobile",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const requested = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(requested.searchParams.has("key")).toBe(false);
  });
});

describe("runPageSpeed error handling", () => {
  async function expectFailure(
    response: Response,
    code: string,
  ): Promise<PageSpeedError> {
    const fetchImpl = vi.fn().mockResolvedValue(response);
    try {
      await runPageSpeed({
        url: "https://example.com",
        strategy: "mobile",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PageSpeedError);
      const psiError = error as PageSpeedError;
      expect(psiError.code).toBe(code);
      return psiError;
    }
    throw new Error("expected runPageSpeed to throw");
  }

  it("maps a quota 429 to a retryable quota error", async () => {
    const error = await expectFailure(
      jsonResponse({ error: { message: "Quota exceeded" } }, 429),
      "quota-exceeded",
    );
    expect(error.userMessage).toMatch(/rate limit/i);
  });

  it("maps a 403 quota message to quota-exceeded", async () => {
    await expectFailure(
      jsonResponse({ error: { message: "Quota exceeded for quota metric" } }, 403),
      "quota-exceeded",
    );
  });

  it("maps a 403 without a quota message to an API-key problem", async () => {
    await expectFailure(
      jsonResponse({ error: { message: "The caller does not have permission" } }, 403),
      "invalid-api-key",
    );
  });

  it("maps a 400 about the API key to invalid-api-key", async () => {
    await expectFailure(
      jsonResponse({ error: { message: "API key not valid" } }, 400),
      "invalid-api-key",
    );
  });

  it("maps other 400s to an unreachable target", async () => {
    const error = await expectFailure(
      jsonResponse({ error: { message: "Unable to process request" } }, 400),
      "target-unreachable",
    );
    expect(error.userMessage).toMatch(/publicly reachable/i);
  });

  it("maps a 500 to a transient provider error", async () => {
    await expectFailure(jsonResponse({}, 500), "network-error");
  });

  it("surfaces a Lighthouse runtime error carried inside a 200", async () => {
    const error = await expectFailure(
      jsonResponse({
        lighthouseResult: {
          categories: {},
          runtimeError: {
            code: "ERRORED_DOCUMENT_REQUEST",
            message: "Status code: 500",
          },
        },
      }),
      "lighthouse-error",
    );
    expect(error.userMessage).toContain("Status code: 500");
  });

  it("rejects a 200 with no Lighthouse categories", async () => {
    await expectFailure(jsonResponse({ lighthouseResult: {} }), "bad-response");
  });

  it("rejects a response that is not JSON", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response("<html>gateway error</html>", { status: 200 }));

    await expect(
      runPageSpeed({
        url: "https://example.com",
        strategy: "mobile",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "bad-response" });
  });

  it("reports a timeout distinctly from a network failure", async () => {
    const fetchImpl = vi.fn().mockImplementation((_url, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const abort = new Error("aborted");
          abort.name = "AbortError";
          reject(abort);
        });
      });
    });

    const promise = runPageSpeed({
      url: "https://example.com",
      strategy: "mobile",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 10,
    });

    await expect(promise).rejects.toMatchObject({ code: "timeout" });
  });

  it("maps a connection failure to a network error", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      runPageSpeed({
        url: "https://example.com",
        strategy: "mobile",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "network-error" });
  });

  it("never leaks the API key into a user-facing message", async () => {
    process.env.PAGESPEED_API_KEY = "super-secret-key";
    const error = await expectFailure(
      jsonResponse({ error: { message: "Quota exceeded" } }, 429),
      "quota-exceeded",
    );
    expect(error.userMessage).not.toContain("super-secret-key");
  });
});
