import { describe, expect, it } from "vitest";
import {
  checkAuditUrl,
  isBlockedHostname,
  isPrivateIpv4,
  isPrivateIpv6,
} from "./url-guard";

describe("isPrivateIpv4", () => {
  it.each([
    ["10.0.0.1", "RFC 1918 class A"],
    ["172.16.5.4", "RFC 1918 class B lower bound"],
    ["172.31.255.255", "RFC 1918 class B upper bound"],
    ["192.168.1.1", "RFC 1918 class C"],
    ["127.0.0.1", "loopback"],
    ["0.0.0.0", "this network"],
    ["169.254.169.254", "cloud metadata"],
    ["169.254.1.1", "link-local"],
    ["100.64.0.1", "carrier-grade NAT"],
    ["198.18.0.1", "benchmarking"],
    ["224.0.0.1", "multicast"],
    ["255.255.255.255", "broadcast"],
  ])("rejects %s (%s)", (address) => {
    expect(isPrivateIpv4(address)).toBe(true);
  });

  it.each([
    ["8.8.8.8"],
    ["1.1.1.1"],
    ["172.15.0.1"], // just below the RFC 1918 class B range
    ["172.32.0.1"], // just above it
    ["192.167.0.1"],
    ["100.63.0.1"], // just below CGNAT
    ["223.255.255.255"], // just below multicast
  ])("allows public address %s", (address) => {
    expect(isPrivateIpv4(address)).toBe(false);
  });
});

describe("isPrivateIpv6", () => {
  it.each([
    "::1",
    "::",
    "fd00::1", // unique-local
    "fc00::1",
    "fe80::1", // link-local
    "ff02::1", // multicast
    "::ffff:127.0.0.1", // IPv4-mapped loopback
    "::ffff:10.1.2.3", // IPv4-mapped private
  ])("rejects %s", (address) => {
    expect(isPrivateIpv6(address)).toBe(true);
  });

  it("allows a public IPv6 address", () => {
    expect(isPrivateIpv6("2606:4700:4700::1111")).toBe(false);
  });

  it("allows an IPv4-mapped public address", () => {
    expect(isPrivateIpv6("::ffff:8.8.8.8")).toBe(false);
  });
});

describe("isBlockedHostname", () => {
  it.each([
    "localhost",
    "LOCALHOST",
    "localhost.localdomain",
    "metadata.google.internal",
    "instance-data",
    "app.local",
    "db.internal",
    "service.corp",
    "printer.lan",
  ])("blocks %s", (host) => {
    expect(isBlockedHostname(host)).toBe(true);
  });

  it("allows ordinary public hostnames", () => {
    expect(isBlockedHostname("weblytics.co.za")).toBe(false);
    expect(isBlockedHostname("www.example.com")).toBe(false);
  });

  it("ignores a trailing root dot", () => {
    expect(isBlockedHostname("localhost.")).toBe(true);
  });
});

describe("checkAuditUrl", () => {
  it("accepts a normal https URL", () => {
    const result = checkAuditUrl("https://weblytics.co.za");
    expect(result.ok).toBe(true);
    expect(result.url).toBe("https://weblytics.co.za/");
  });

  it("accepts http and preserves the path and query", () => {
    const result = checkAuditUrl("http://example.com/pricing?ref=1");
    expect(result.ok).toBe(true);
    expect(result.url).toBe("http://example.com/pricing?ref=1");
  });

  it("rejects an empty value", () => {
    expect(checkAuditUrl("  ").reason).toBe("empty");
  });

  it.each([
    ["ftp://example.com", "unsupported-scheme"],
    ["file:///etc/passwd", "unsupported-scheme"],
    ["javascript:alert(1)", "unsupported-scheme"],
    ["data:text/html,<h1>hi", "unsupported-scheme"],
  ])("rejects %s", (url, reason) => {
    expect(checkAuditUrl(url).reason).toBe(reason);
  });

  it("rejects credentials embedded in the URL", () => {
    expect(checkAuditUrl("https://user:pass@example.com").reason).toBe(
      "credentials-in-url",
    );
  });

  it.each([
    "http://localhost:3000",
    "https://127.0.0.1",
    "http://[::1]:8080",
    "http://169.254.169.254/latest/meta-data/",
    "http://metadata.google.internal/computeMetadata/v1/",
    "https://10.0.0.5/admin",
    "https://192.168.0.1",
    "http://internal.corp/dashboard",
  ])("rejects internal target %s", (url) => {
    const result = checkAuditUrl(url);
    expect(result.ok).toBe(false);
    expect(["blocked-host", "private-address"]).toContain(result.reason);
  });

  it("rejects a single-label hostname", () => {
    expect(checkAuditUrl("https://intranet").ok).toBe(false);
  });

  it("allows a public bare IP", () => {
    expect(checkAuditUrl("http://8.8.8.8").ok).toBe(true);
  });

  it("rejects a URL beyond the length cap", () => {
    const long = `https://example.com/${"a".repeat(2100)}`;
    expect(checkAuditUrl(long).reason).toBe("too-long");
  });

  it("rejects a malformed URL", () => {
    expect(checkAuditUrl("https://").reason).toBe("malformed");
  });

  it("returns a message safe to show a user for every rejection", () => {
    for (const url of ["", "ftp://x.com", "http://localhost", "https://10.0.0.1"]) {
      const result = checkAuditUrl(url);
      expect(result.ok).toBe(false);
      expect(result.message).toBeTruthy();
      // Nothing internal should leak into user-facing copy.
      expect(result.message).not.toMatch(/undefined|\[object/i);
    }
  });
});
