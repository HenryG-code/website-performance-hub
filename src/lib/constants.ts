/**
 * Fixed clock for the development demo dataset.
 *
 * The seed generator derives every timestamp from this constant rather than
 * `Date.now()`, so seeding twice produces identical history. Application data
 * uses the real clock — this is only a generator input.
 */
export const REFERENCE_NOW = new Date("2026-08-07T09:00:00.000Z");

export const SCORE_WEIGHTS = {
  performance: 0.4,
  seo: 0.2,
  accessibility: 0.25,
  bestPractices: 0.15,
} as const;
