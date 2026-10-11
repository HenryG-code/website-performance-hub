import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), createClient: vi.fn(), guard: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getUser: mocks.getUser, createClient: mocks.createClient }));
vi.mock("@/lib/security/url-guard", () => ({ assertPublicUrl: mocks.guard }));
const { createWebsite, updateWebsite } = await import("./websites");
const input = { name: "Example", url: "example.com", team: "", environment: "production", tags: [] };

beforeEach(() => {
  mocks.getUser.mockReset().mockResolvedValue({ id: "user-1" });
  mocks.createClient.mockReset();
  mocks.guard.mockReset().mockResolvedValue({ ok: true });
});

describe("website target validation", () => {
  it.each(["create", "update"])("refuses an unsafe target during %s before writing to the database", async (operation) => {
    mocks.guard.mockResolvedValue({ ok: false, message: "That domain resolves to a private address." });
    const result = operation === "create" ? await createWebsite(input) : await updateWebsite("site-1", input);
    expect(result).toEqual({ ok: false, error: "That domain resolves to a private address." });
    expect(mocks.guard).toHaveBeenCalledWith("https://example.com");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it.each(["create", "update"])("does not resolve targets for unauthenticated %s callers", async (operation) => {
    mocks.getUser.mockResolvedValue(null);
    const result = operation === "create" ? await createWebsite(input) : await updateWebsite("site-1", input);
    expect(result.ok).toBe(false);
    expect(mocks.guard).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
