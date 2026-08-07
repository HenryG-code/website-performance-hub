import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Authorization and failure-path tests for the audit action.
 *
 * Supabase and the provider are mocked so these assert the action's own
 * decisions — who may run an audit, and what happens when something fails —
 * rather than re-testing the database or Google.
 */

const getUser = vi.fn();
const createClient = vi.fn();
const runPageSpeed = vi.fn();
const hasApiKey = vi.fn();
const assertPublicUrl = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUser(),
  createClient: () => createClient(),
}));

vi.mock("@/lib/pagespeed/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pagespeed/client")>(
    "@/lib/pagespeed/client",
  );
  return {
    ...actual,
    hasApiKey: () => hasApiKey(),
    runPageSpeed: (options: unknown) => runPageSpeed(options),
  };
});

vi.mock("@/lib/security/url-guard", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security/url-guard")>(
    "@/lib/security/url-guard",
  );
  return { ...actual, assertPublicUrl: (url: string) => assertPublicUrl(url) };
});

const { runAudit } = await import("./audits");

/** Minimal Supabase query-builder stub: every call chains, then resolves. */
function stubClient(overrides: Record<string, unknown> = {}) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  Object.assign(builder, {
    select: chain,
    eq: chain,
    gte: chain,
    lt: chain,
    in: chain,
    order: chain,
    limit: chain,
    insert: chain,
    update: chain,
    delete: chain,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    single: () => Promise.resolve({ data: { id: "audit-1" }, error: null }),
    then: (resolve: (value: unknown) => unknown) =>
      resolve({ data: [], error: null, count: 0 }),
    ...overrides,
  });

  return { from: () => builder };
}

beforeEach(() => {
  getUser.mockReset();
  createClient.mockReset();
  runPageSpeed.mockReset();
  hasApiKey.mockReset();
  assertPublicUrl.mockReset();

  hasApiKey.mockReturnValue(true);
  assertPublicUrl.mockResolvedValue({ ok: true, url: "https://weblytics.co.za/" });
});

describe("runAudit authorization", () => {
  it("refuses an unauthenticated caller", async () => {
    getUser.mockResolvedValue(null);

    const result = await runAudit("website-1", "mobile");

    expect(result).toEqual({ ok: false, error: "You need to be signed in." });
    // Nothing may reach the provider without a session.
    expect(runPageSpeed).not.toHaveBeenCalled();
  });

  it("refuses a website the caller does not own", async () => {
    getUser.mockResolvedValue({ id: "user-1" });
    // RLS returns no row for another user's website, so the lookup is empty.
    createClient.mockResolvedValue(
      stubClient({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
    );

    const result = await runAudit("someone-elses-website", "mobile");

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("not in your account");
    expect(runPageSpeed).not.toHaveBeenCalled();
  });

  it("rejects an unknown strategy before touching the database", async () => {
    getUser.mockResolvedValue({ id: "user-1" });

    const result = await runAudit("website-1", "tablet");

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("mobile or desktop");
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("runAudit safety and configuration", () => {
  beforeEach(() => {
    getUser.mockResolvedValue({ id: "user-1" });
    createClient.mockResolvedValue(
      stubClient({
        maybeSingle: () =>
          Promise.resolve({
            data: { id: "website-1", url: "http://localhost:3000", name: "Local" },
            error: null,
          }),
      }),
    );
  });

  it("refuses a target that fails the SSRF guard", async () => {
    assertPublicUrl.mockResolvedValue({
      ok: false,
      reason: "blocked-host",
      message: "Local and internal addresses cannot be audited.",
    });

    const result = await runAudit("website-1", "mobile");

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("internal addresses");
    expect(runPageSpeed).not.toHaveBeenCalled();
  });

  it("refuses to run when no API key is configured", async () => {
    hasApiKey.mockReturnValue(false);

    const result = await runAudit("website-1", "mobile");

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toContain("PAGESPEED_API_KEY");
    expect(runPageSpeed).not.toHaveBeenCalled();
  });
});
