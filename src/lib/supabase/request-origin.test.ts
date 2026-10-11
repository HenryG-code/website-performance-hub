import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headerStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => headerStore.get(name) ?? null }),
}));
const { authRedirectOrigin } = await import("./request-origin");

function setHeaders(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) headerStore.set(key, value);
}

beforeEach(() => {
  headerStore.clear();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://configured.example.com");
  for (const key of ["AUTH_ALLOWED_ORIGINS", "VERCEL_URL", "VERCEL_BRANCH_URL", "VERCEL_PROJECT_PRODUCTION_URL"]) {
    vi.stubEnv(key, "");
  }
});
afterEach(() => vi.unstubAllEnvs());

describe("authRedirectOrigin", () => {
  it("keeps the known production domain working despite a SITE_URL typo", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://performancehub.webletics.co.za");
    setHeaders({ host: "performancehub.weblytics.co.za" });
    expect(await authRedirectOrigin()).toBe("https://performancehub.weblytics.co.za");
  });

  it("allows forwarded headers to select a trusted origin", async () => {
    setHeaders({ host: "internal-router.vercel.app", "x-forwarded-host": "performancehub.weblytics.co.za" });
    expect(await authRedirectOrigin()).toBe("https://performancehub.weblytics.co.za");
  });

  it.each([
    "attacker.example.com", "configured.example.com.attacker.com",
    "evil.example.com/path", "evil.example.com\\path", "user@configured.example.com",
    "configured.example.com, attacker.example.com", "localhost:3000",
  ])("does not trust a supplied host %s", async (host) => {
    setHeaders({ host, "x-forwarded-host": host });
    expect(await authRedirectOrigin()).toBe("https://configured.example.com");
  });

  it("does not let forwarded-proto downgrade a trusted origin", async () => {
    setHeaders({ host: "configured.example.com", "x-forwarded-proto": "http" });
    expect(await authRedirectOrigin()).toBe("https://configured.example.com");
  });

  it("supports the exact deployment domain from Vercel's server environment", async () => {
    vi.stubEnv("VERCEL_URL", "website-performance-hub-abc.vercel.app");
    setHeaders({ host: "website-performance-hub-abc.vercel.app" });
    expect(await authRedirectOrigin()).toBe("https://website-performance-hub-abc.vercel.app");
  });

  it("supports explicitly trusted extra domains", async () => {
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://other.example.com, https://extra.example.com");
    setHeaders({ host: "extra.example.com" });
    expect(await authRedirectOrigin()).toBe("https://extra.example.com");
  });

  it.each(["http://attacker.example.com", "https://attacker.example.com/path", "https://user:pass@attacker.example.com"])(
    "ignores an invalid configured origin %s", async (origin) => {
      vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
      setHeaders({ host: "attacker.example.com" });
      expect(await authRedirectOrigin()).toBe("https://performancehub.weblytics.co.za");
    },
  );

  it.each(["localhost:3000", "127.0.0.1:3000", "[::1]:3000"])("allows exact loopback %s in development", async (host) => {
    vi.stubEnv("NODE_ENV", "development");
    setHeaders({ host });
    expect(await authRedirectOrigin()).toBe(`http://${host}`);
  });

  it("does not mistake a localhost prefix for loopback", async () => {
    vi.stubEnv("NODE_ENV", "development");
    setHeaders({ host: "localhost.attacker.example.com" });
    expect(await authRedirectOrigin()).toBe("https://configured.example.com");
  });
});
