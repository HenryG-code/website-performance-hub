import { describe, expect, it, vi } from "vitest";
import { uptimeWindow } from "./uptime";

describe("uptimeWindow", () => {
  it("computes check-based availability and response average for the selected monitor", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T12:00:00Z"));

    const result = uptimeWindow(
      [
        {
          monitorId: "monitor-a",
          day: "2026-09-03",
          checkCount: 20,
          successCount: 19,
          responseSampleCount: 20,
          responseTotalMs: 4000,
          responseMinMs: 100,
          responseMaxMs: 400,
          lastCheckedAt: "2026-09-03T11:00:00Z",
        },
        {
          monitorId: "monitor-b",
          day: "2026-09-03",
          checkCount: 5,
          successCount: 0,
          responseSampleCount: 0,
          responseTotalMs: 0,
          responseMinMs: null,
          responseMaxMs: null,
          lastCheckedAt: "2026-09-03T11:00:00Z",
        },
      ],
      "monitor-a",
      30,
    );

    expect(result).toEqual({
      checks: 20,
      successes: 19,
      availability: 95,
      averageResponseMs: 200,
    });

    vi.useRealTimers();
  });

  it("returns unknown availability until a monitor has recorded checks", () => {
    expect(uptimeWindow([], undefined, 7)).toEqual({
      checks: 0,
      successes: 0,
      availability: null,
      averageResponseMs: null,
    });
  });
});
