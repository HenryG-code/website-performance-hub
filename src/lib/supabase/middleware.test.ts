import { describe, expect, it } from "vitest";
import { isPublic } from "./middleware";

describe("isPublic — auth screens", () => {
  it.each([
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/check-email",
    "/auth/callback",
  ])("allows %s without a session", (path) => {
    expect(isPublic(path)).toBe(true);
  });
});

/*
 * These are fetched by clients that can never hold a session: link unfurlers
 * reading the Open Graph card, iOS fetching the touch icon, the browser
 * loading the manifest. Gating them made every shared link render without a
 * preview, which is exactly the kind of thing that only shows up in
 * production.
 */
describe("isPublic — generated metadata routes", () => {
  it.each([
    "/manifest.webmanifest",
    "/opengraph-image",
    "/apple-icon",
    "/icon",
    "/robots.txt",
    "/sitemap.xml",
  ])("allows %s without a session", (path) => {
    expect(isPublic(path)).toBe(true);
  });

  it.each([
    "/icon/route",
    "/apple-icon/route",
    "/opengraph-image-a1b2c3",
    "/twitter-image",
  ])("allows the hashed or nested variant %s", (path) => {
    expect(isPublic(path)).toBe(true);
  });
});

describe("isPublic — private routes stay private", () => {
  it.each([
    "/",
    "/websites",
    "/websites/abc-123",
    "/audits",
    "/audits/abc-123",
    "/issues",
    "/reports",
    "/settings",
  ])("requires a session for %s", (path) => {
    expect(isPublic(path)).toBe(false);
  });

  // The metadata allowance must not become a prefix hole that exposes app
  // routes whose names happen to start the same way.
  it.each([
    "/icons-of-my-account",
    "/apple-icons-private",
    "/manifest-secrets",
    "/sign-in-audit-data",
  ])("does not let %s slip through on a prefix match", (path) => {
    expect(isPublic(path)).toBe(false);
  });
});
