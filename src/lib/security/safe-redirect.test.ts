import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("keeps a same-origin absolute path", () => {
    expect(safeNextPath("/settings")).toBe("/settings");
    expect(safeNextPath("/websites/abc-123")).toBe("/websites/abc-123");
  });

  it("keeps a path with a query string", () => {
    expect(safeNextPath("/issues?severity=critical")).toBe(
      "/issues?severity=critical",
    );
  });

  it("falls back to the dashboard when absent", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it.each([
    "https://evil.example.com",
    "http://evil.example.com/path",
    "//evil.example.com",
    "///evil.example.com",
    "javascript:alert(1)",
    "data:text/html,<h1>hi",
    "evil.example.com",
  ])("refuses to redirect off-site via %s", (next) => {
    expect(safeNextPath(next)).toBe("/");
  });

  // Browsers normalise backslashes in the authority to forward slashes, so
  // `/\evil.com` can navigate off-site despite starting with a slash.
  it.each(["/\\evil.example.com", "/\\/evil.example.com", "/path\\..\\x"])(
    "refuses backslash-based bypass %s",
    (next) => {
      expect(safeNextPath(next)).toBe("/");
    },
  );
});
