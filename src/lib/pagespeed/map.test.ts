import { describe, expect, it } from "vitest";
import {
  mapFieldMetrics,
  mapFindings,
  mapLabMetrics,
  mapPageSpeedResponse,
  mapPassedChecks,
  mapScores,
  severityFor,
} from "./map";
import {
  psiWithFieldData,
  psiWithOriginFieldData,
  psiWithoutFieldData,
} from "./__fixtures__/psi-response";
import type { PsiResponse } from "./types";

describe("mapScores", () => {
  it("converts Lighthouse 0-1 scores to 0-100", () => {
    expect(mapScores(psiWithFieldData)).toEqual({
      performance: 64,
      accessibility: 87,
      seo: 92,
      bestPractices: 75,
    });
  });

  it("omits a category Lighthouse could not score rather than defaulting it", () => {
    const partial: PsiResponse = {
      lighthouseResult: {
        categories: {
          performance: { id: "performance", score: 0.5 },
          seo: { id: "seo", score: null },
        },
        audits: {},
      },
    };

    const scores = mapScores(partial);
    expect(scores.performance).toBe(50);
    expect("seo" in scores).toBe(false);
  });

  it("returns nothing for a response with no categories", () => {
    expect(mapScores({})).toEqual({});
  });
});

describe("mapLabMetrics", () => {
  it("reads numeric values straight from the Lighthouse audits", () => {
    expect(mapLabMetrics(psiWithFieldData)).toEqual({
      lcpMs: 4100,
      fcpMs: 1900,
      cls: 0.06,
      tbtMs: 480,
      ttfbMs: 1200,
      speedIndexMs: 3400,
      interactiveMs: null,
    });
  });

  it("returns null for every metric Lighthouse did not report", () => {
    expect(mapLabMetrics({})).toEqual({
      lcpMs: null,
      fcpMs: null,
      cls: null,
      tbtMs: null,
      ttfbMs: null,
      speedIndexMs: null,
      interactiveMs: null,
    });
  });
});

describe("mapFieldMetrics", () => {
  it("reads URL-level CrUX data and rescales CLS", () => {
    const field = mapFieldMetrics(psiWithFieldData);

    expect(field.available).toBe(true);
    expect(field.scope).toBe("url");
    expect(field.overallCategory).toBe("AVERAGE");
    expect(field.lcpMs).toBe(3200);
    expect(field.inpMs).toBe(180);
    // CrUX sends 12, meaning a CLS of 0.12.
    expect(field.cls).toBeCloseTo(0.12, 5);
    expect(field.categories.inp).toBe("FAST");
  });

  it("reports unavailable when Google returned no field data", () => {
    const field = mapFieldMetrics(psiWithoutFieldData);

    expect(field.available).toBe(false);
    expect(field.scope).toBeNull();
    expect(field.lcpMs).toBeNull();
    expect(field.overallCategory).toBeNull();
  });

  it("falls back to origin-level data and records the wider scope", () => {
    const field = mapFieldMetrics(psiWithOriginFieldData);

    expect(field.available).toBe(true);
    expect(field.scope).toBe("origin");
    expect(field.lcpMs).toBe(2100);
  });

  it("treats an empty metrics object as no data", () => {
    const empty: PsiResponse = { loadingExperience: { metrics: {} } };
    expect(mapFieldMetrics(empty).available).toBe(false);
  });
});

describe("severityFor", () => {
  it("calls a heavily weighted failure critical", () => {
    expect(severityFor(0.2, 0.25, null)).toBe("critical");
  });

  it("calls a failure with a large measured saving critical", () => {
    expect(severityFor(0.3, 0.01, 1500)).toBe("critical");
  });

  it("calls a low-weight failure high rather than critical", () => {
    expect(severityFor(0.3, 0.01, 100)).toBe("high");
  });

  it("grades the needs-improvement band by weight", () => {
    expect(severityFor(0.7, 0.2, null)).toBe("high");
    expect(severityFor(0.7, 0.02, null)).toBe("medium");
  });
});

describe("mapFindings", () => {
  const findings = mapFindings(psiWithFieldData);
  const ids = findings.map((finding) => finding.ruleId);

  it("includes every scored audit below the passing threshold", () => {
    expect(ids).toContain("render-blocking-resources");
    expect(ids).toContain("color-contrast");
    expect(ids).toContain("errors-in-console");
    expect(ids).toContain("largest-contentful-paint");
  });

  it("excludes passing audits", () => {
    expect(ids).not.toContain("image-alt");
    expect(ids).not.toContain("meta-description");
  });

  it("excludes informative and not-applicable audits", () => {
    expect(ids).not.toContain("screenshot-thumbnails");
    expect(ids).not.toContain("canonical-check");
  });

  it("attributes each finding to the right category", () => {
    const byId = new Map(findings.map((f) => [f.ruleId, f]));
    expect(byId.get("color-contrast")?.category).toBe("accessibility");
    expect(byId.get("errors-in-console")?.category).toBe("best-practices");
    expect(byId.get("render-blocking-resources")?.category).toBe("performance");
  });

  it("records the measured saving and marks it an opportunity", () => {
    const blocking = findings.find((f) => f.ruleId === "render-blocking-resources");
    expect(blocking?.savingsMs).toBe(1180);
    expect(blocking?.kind).toBe("opportunity");
    expect(blocking?.displayValue).toBe("Potential savings of 1,180 ms");
  });

  it("marks an audit with no reported saving a diagnostic", () => {
    const contrast = findings.find((f) => f.ruleId === "color-contrast");
    expect(contrast?.savingsMs).toBeNull();
    expect(contrast?.kind).toBe("diagnostic");
  });

  // Lighthouse 13 moved savings for its insight audits out of
  // `details.overallSavingsMs` and into `metricSavings`. Reading only the old
  // field silently drops the saving on most modern performance advice.
  it("reads savings from metricSavings when there is no overallSavingsMs", () => {
    const insight = findings.find((f) => f.ruleId === "render-blocking-insight");
    expect(insight?.savingsMs).toBe(450);
    expect(insight?.kind).toBe("opportunity");
  });

  it("takes the largest per-metric saving rather than summing overlaps", () => {
    // LCP 450 and FCP 450 describe the same 450ms, not 900ms.
    const insight = findings.find((f) => f.ruleId === "render-blocking-insight");
    expect(insight?.savingsMs).toBe(450);
  });

  it("treats an insight reporting only byte savings as a diagnostic", () => {
    const insight = findings.find((f) => f.ruleId === "image-delivery-insight");
    expect(insight?.savingsMs).toBeNull();
    expect(insight?.kind).toBe("diagnostic");
    // The human-readable saving is still carried through.
    expect(insight?.displayValue).toBe("Est savings of 178 KiB");
  });

  it("keeps metricSavings audits in the findings list", () => {
    expect(ids).toContain("render-blocking-insight");
    expect(ids).toContain("image-delivery-insight");
  });

  it("derives score impact from the audit's weighted shortfall", () => {
    // total-blocking-time carries weight 30 of 55 in the fixture, scoring 0.55,
    // so the recoverable points are 30/55 * 0.45 * 100 = 25 (rounded).
    const tbt = findings.find((f) => f.ruleId === "total-blocking-time");
    expect(tbt?.scoreImpact).toBe(25);
  });

  it("gives zero-weight audits no score impact", () => {
    const blocking = findings.find((f) => f.ruleId === "render-blocking-resources");
    expect(blocking?.scoreImpact).toBe(0);
  });

  it("collects only real resource URLs from the details", () => {
    const blocking = findings.find((f) => f.ruleId === "render-blocking-resources");
    expect(blocking?.affectedResources).toEqual([
      "https://example.com/app.css",
      "https://example.com/vendor.js",
    ]);
  });

  it("orders findings by score impact, highest first", () => {
    const impacts = findings.map((f) => f.scoreImpact);
    expect([...impacts].sort((a, b) => b - a)).toEqual(impacts);
  });

  it("returns nothing for a response with no audits", () => {
    expect(mapFindings({})).toEqual([]);
  });
});

describe("mapPassedChecks", () => {
  it("lists only scored audits that passed", () => {
    const passed = mapPassedChecks(psiWithFieldData);

    expect(passed).toContain("Image elements have [alt] attributes");
    expect(passed).toContain("Document has a meta description");
    expect(passed).not.toContain("Screenshot Thumbnails");
    expect(passed).not.toContain(
      "Background and foreground colors have a sufficient contrast ratio",
    );
  });
});

describe("mapPageSpeedResponse", () => {
  it("carries provenance through from the response", () => {
    const mapped = mapPageSpeedResponse(psiWithFieldData, "mobile");

    expect(mapped.strategy).toBe("mobile");
    expect(mapped.requestedUrl).toBe("https://example.com");
    expect(mapped.finalUrl).toBe("https://example.com/");
    expect(mapped.lighthouseVersion).toBe("12.2.1");
    expect(mapped.analysedAt).toBe("2026-08-07T12:34:00.000Z");
  });

  it("counts passed and total checks consistently", () => {
    const mapped = mapPageSpeedResponse(psiWithFieldData, "desktop");
    expect(mapped.totalCount).toBe(mapped.passedCount + mapped.findings.length);
  });

  it("falls back to the analysis timestamp when fetchTime is absent", () => {
    const mapped = mapPageSpeedResponse(
      { ...psiWithFieldData, lighthouseResult: { categories: {}, audits: {} } },
      "mobile",
    );
    expect(mapped.analysedAt).toBe("2026-08-07T12:34:56.789Z");
  });

  it("produces no scores and no findings for an empty response", () => {
    const mapped = mapPageSpeedResponse({}, "mobile");
    expect(mapped.scores).toEqual({});
    expect(mapped.findings).toEqual([]);
    expect(mapped.field.available).toBe(false);
  });
});
