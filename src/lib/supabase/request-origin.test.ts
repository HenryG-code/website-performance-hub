import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These cover the regression that took password reset down in production: a
 * typo in `NEXT_PUBLIC_SITE_URL` pointed every emailed auth link at a domain
 * that did not resolve. Deriving the origin from the request removes the
 * variable from the critical path entirely.
 */

const headerStore = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
  }),
}));

const { authRedirectOrigin } = await import("./request-origin");

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

function setHeaders(values: Record<string, string>) {
  headerStore.clear();
  for (const [key, value] of Object.entries(values)) {
    headerStore.set(key.toLowerCase(), value);
  }
}

beforeEach(() => {
  headerStore.clear();
  process.env.NEXT_PUBLIC_SITE_URL = "https://configured.example.com";
});

afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
});

describe("authRedirectOrigin", () => {
  it("uses the host the request actually arrived on", async () => {
    setHeaders({ host: "performancehub.weblytics.co.za" });

    expect(await authRedirectOrigin()).toBe(
      "https://performancehub.weblytics.co.za",
    );
  });

  // The whole point: a wrong environment variable must not be able to break
  // password reset again.
  it("ignores a misconfigured NEXT_PUBLIC_SITE_URL", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://performancehub.webletics.co.za";
    setHeaders({ host: "performancehub.weblytics.co.za" });

    const origin = await authRedirectOrigin();

    expect(origin).toBe("https://performancehub.weblytics.co.za");
    expect(origin).not.toContain("webletics");
  });

  it("prefers x-forwarded-host when a proxy rewrote the host", async () => {
    setHeaders({
      host: "internal-router.vercel.app",
      "x-forwarded-host": "performancehub.weblytics.co.za",
    });

    expect(await authRedirectOrigin()).toBe(
      "https://performancehub.weblytics.co.za",
    );
  });

  it("takes the first entry when proxies append to the header", async () => {
    setHeaders({
      "x-forwarded-host": "performancehub.weblytics.co.za, inner.vercel.app",
      "x-forwarded-proto": "https, http",
    });

    expect(await authRedirectOrigin()).toBe(
      "https://performancehub.weblytics.co.za",
    );
  });

  it("emails preview deployments a link back to themselves", async () => {
    setHeaders({ host: "website-performance-hub-git-abc.vercel.app" });

    expect(await authRedirectOrigin()).toBe(
      "https://website-performance-hub-git-abc.vercel.app",
    );
  });

  it("uses http for local development", async () => {
    setHeaders({ host: "localhost:3000" });

    expect(await authRedirectOrigin()).toBe("http://localhost:3000");
  });

  it("honours an explicit forwarded protocol", async () => {
    setHeaders({ host: "example.com", "x-forwarded-proto": "http" });

    expect(await authRedirectOrigin()).toBe("http://example.com");
  });

  it("falls back to the configured value when no host header is present", async () => {
    setHeaders({});

    expect(await authRedirectOrigin()).toBe("https://configured.example.com");
  });

  it("rejects a host containing a path separator", async () => {
    setHeaders({ host: "evil.example.com/path" });

    expect(await authRedirectOrigin()).toBe("https://configured.example.com");
  });
});
