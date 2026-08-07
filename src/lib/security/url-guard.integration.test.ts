import { describe, expect, it } from "vitest";
import { assertPublicUrl } from "./url-guard";

/**
 * DNS-dependent SSRF checks.
 *
 * Kept out of the default suite because they resolve real hostnames: the unit
 * tests cover the pure logic, and these prove the resolution step actually
 * runs. Run with `npm run test:live`.
 *
 * `localtest.me` and `*.nip.io` are public DNS services that resolve to
 * addresses of your choosing — the standard way to demonstrate DNS rebinding.
 * A guard that only pattern-matches hostnames lets these straight through.
 */

const ALLOWED = [
  "https://weblytics.co.za",
  "https://sinoplant.co.za",
  "https://bwts.co.za",
];

const BLOCKED_BY_RESOLUTION = [
  // Resolves to 127.0.0.1 despite looking like an ordinary domain.
  "https://localtest.me",
  "https://127.0.0.1.nip.io",
  "https://10.0.0.1.nip.io",
];

describe("assertPublicUrl against real DNS", () => {
  it.each(ALLOWED)("allows the real public site %s", async (url) => {
    const result = await assertPublicUrl(url);
    expect(result.ok, result.message).toBe(true);
  });

  it.each(BLOCKED_BY_RESOLUTION)(
    "blocks %s, which resolves to a private address",
    async (url) => {
      const result = await assertPublicUrl(url);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("private-address");
    },
  );

  it("blocks a hostname that does not resolve at all", async () => {
    const result = await assertPublicUrl(
      "https://this-domain-should-never-exist-ph-qa.example",
    );
    expect(result.ok).toBe(false);
  });
});
