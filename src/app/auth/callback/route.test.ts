import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ exchange: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange, verifyOtp: mocks.verify } }),
}));
vi.mock("@/lib/supabase/request-origin", () => ({ authRedirectOrigin: async () => "https://trusted.example.com" }));
const { GET } = await import("./route");

beforeEach(() => {
  mocks.exchange.mockReset().mockResolvedValue({ error: null });
  mocks.verify.mockReset().mockResolvedValue({ error: null });
});

describe("auth callback redirects", () => {
  it.each(["//evil.example.com", "/\\evil.example.com", "/\t/evil.example.com", "https://evil.example.com"])(
    "refuses unsafe next destination %s", async (next) => {
      const url = new URL("https://spoofed.example.com/auth/callback?code=test");
      url.searchParams.set("next", next);
      const response = await GET(new NextRequest(url));
      expect(response.headers.get("location")).toBe("https://trusted.example.com/");
    },
  );

  it("preserves recovery's safe next path", async () => {
    const response = await GET(new NextRequest("https://spoofed.example.com/auth/callback?token_hash=test&type=recovery&next=/reset-password"));
    expect(mocks.verify).toHaveBeenCalledWith({ token_hash: "test", type: "recovery" });
    expect(response.headers.get("location")).toBe("https://trusted.example.com/reset-password");
  });

  it("sends invalid links to sign-in on the trusted origin", async () => {
    mocks.exchange.mockResolvedValue({ error: new Error("invalid") });
    const response = await GET(new NextRequest("https://spoofed.example.com/auth/callback?code=invalid"));
    expect(response.headers.get("location")).toBe("https://trusted.example.com/sign-in?error=link-invalid");
  });
});
