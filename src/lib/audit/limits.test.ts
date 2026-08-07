import { describe, expect, it } from "vitest";
import {
  AUDIT_COOLDOWN_MS,
  MAX_AUDITS_PER_DAY,
  MAX_AUDITS_PER_HOUR,
  evaluateThrottle,
} from "./limits";

const NOW = new Date("2026-08-07T12:00:00.000Z");

const BASE = {
  hasRunningAudit: false,
  lastRunStartedAt: null,
  auditsInLastHour: 0,
  auditsInLastDay: 0,
  now: NOW,
};

describe("evaluateThrottle", () => {
  it("allows a first run", () => {
    expect(evaluateThrottle(BASE)).toEqual({ allowed: true });
  });

  it("blocks a duplicate run while one is in flight", () => {
    const decision = evaluateThrottle({ ...BASE, hasRunningAudit: true });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("already-running");
  });

  it("blocks a repeat run inside the cooldown and says how long to wait", () => {
    const decision = evaluateThrottle({
      ...BASE,
      lastRunStartedAt: new Date(NOW.getTime() - 20_000),
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("cooldown");
    expect(decision.retryAfterSeconds).toBe(40);
    expect(decision.message).toContain("40s");
  });

  it("allows a repeat run once the cooldown has elapsed", () => {
    const decision = evaluateThrottle({
      ...BASE,
      lastRunStartedAt: new Date(NOW.getTime() - AUDIT_COOLDOWN_MS - 1),
    });

    expect(decision.allowed).toBe(true);
  });

  it("blocks once the hourly limit is reached", () => {
    const decision = evaluateThrottle({
      ...BASE,
      auditsInLastHour: MAX_AUDITS_PER_HOUR,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("hourly-limit");
  });

  it("blocks once the daily limit is reached", () => {
    const decision = evaluateThrottle({
      ...BASE,
      auditsInLastDay: MAX_AUDITS_PER_DAY,
      auditsInLastHour: 1,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("daily-limit");
  });

  it("reports the daily limit ahead of the hourly one when both are hit", () => {
    const decision = evaluateThrottle({
      ...BASE,
      auditsInLastHour: MAX_AUDITS_PER_HOUR,
      auditsInLastDay: MAX_AUDITS_PER_DAY,
    });

    // The daily cap is the longer wait, so it is the more useful thing to say.
    expect(decision.reason).toBe("daily-limit");
  });

  it("prioritises an in-flight run over every other reason", () => {
    const decision = evaluateThrottle({
      ...BASE,
      hasRunningAudit: true,
      auditsInLastDay: MAX_AUDITS_PER_DAY,
      lastRunStartedAt: NOW,
    });

    expect(decision.reason).toBe("already-running");
  });

  it("allows a run just below every limit", () => {
    const decision = evaluateThrottle({
      ...BASE,
      auditsInLastHour: MAX_AUDITS_PER_HOUR - 1,
      auditsInLastDay: MAX_AUDITS_PER_DAY - 1,
    });

    expect(decision.allowed).toBe(true);
  });
});
