import { describe, expect, it } from "vitest";
import { runPageSpeed } from "./client";
import { mapPageSpeedResponse } from "./map";
import type { PsiStrategy } from "./types";

/**
 * Live integration check against real websites.
 *
 * Excluded from the default test run: it calls Google, costs quota, and takes
 * 20-60s per site. Run deliberately with a key configured:
 *
 *   PAGESPEED_LIVE=1 npx vitest run --config vitest.live.config.mts
 *
 * The point is to catch provider drift — a renamed audit id, a moved savings
 * field, a changed CrUX encoding — which fixtures cannot, because fixtures
 * only ever reflect what the API looked like when they were captured.
 */

const SITES = [
  "https://weblytics.co.za",
  "https://sinoplant.co.za",
  "https://bwts.co.za",
] as const;

const STRATEGIES: PsiStrategy[] = ["mobile", "desktop"];

const RUN_LIVE = process.env.PAGESPEED_LIVE === "1";

describe.runIf(RUN_LIVE)("live PageSpeed audits", () => {
  for (const url of SITES) {
    for (const strategy of STRATEGIES) {
      it(
        `returns complete, self-consistent data for ${url} (${strategy})`,
        { timeout: 120_000 },
        async () => {
          const psi = await runPageSpeed({ url, strategy });
          const mapped = mapPageSpeedResponse(psi, strategy);

          // ---- provenance: every stored figure must be traceable ----------
          expect(mapped.requestedUrl).toBeTruthy();
          expect(mapped.finalUrl).toBeTruthy();
          expect(mapped.lighthouseVersion).toMatch(/^\d+\./);
          expect(mapped.analysedAt).toBeTruthy();
          expect(Number.isNaN(Date.parse(mapped.analysedAt!))).toBe(false);

          // Google must be reporting on the host we asked about.
          expect(new URL(mapped.finalUrl!).hostname).toContain(
            new URL(url).hostname.replace(/^www\./, ""),
          );

          // ---- all four categories, in range ------------------------------
          for (const key of [
            "performance",
            "accessibility",
            "seo",
            "bestPractices",
          ] as const) {
            const score = mapped.scores[key];
            expect(score, `${key} missing`).toBeTypeOf("number");
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
          }

          // ---- lab metrics are present and plausible ----------------------
          expect(mapped.lab.lcpMs).toBeGreaterThan(0);
          expect(mapped.lab.cls).not.toBeNull();

          // ---- lab and field stay separate --------------------------------
          if (!mapped.field.available) {
            // Absent field data must stay absent: no lab value may leak across.
            expect(mapped.field.lcpMs).toBeNull();
            expect(mapped.field.inpMs).toBeNull();
            expect(mapped.field.cls).toBeNull();
            expect(mapped.field.overallCategory).toBeNull();
            expect(mapped.field.scope).toBeNull();
          } else {
            expect(["url", "origin"]).toContain(mapped.field.scope);
            // CrUX CLS is a small ratio; a value above 5 means the divide-by-100
            // rescaling was dropped.
            if (mapped.field.cls !== null) {
              expect(mapped.field.cls).toBeLessThan(5);
            }
          }

          // ---- findings are real and internally consistent ----------------
          expect(mapped.totalCount).toBe(
            mapped.passedCount + mapped.findings.length,
          );
          for (const finding of mapped.findings) {
            expect(finding.ruleId).toBeTruthy();
            expect(finding.title).toBeTruthy();
            expect(finding.scoreImpact).toBeGreaterThanOrEqual(0);
            expect(finding.scoreImpact).toBeLessThanOrEqual(100);
            if (finding.savingsMs !== null) {
              expect(finding.savingsMs).toBeGreaterThan(0);
            }
            // An opportunity is defined by having a measured saving.
            expect(finding.kind === "opportunity").toBe(
              finding.savingsMs !== null,
            );
          }
        },
      );
    }
  }
});
