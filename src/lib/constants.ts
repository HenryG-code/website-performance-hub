/**
 * Fixed clock for the mock dataset.
 *
 * Every generated timestamp is derived from this constant rather than
 * `Date.now()` so the server-rendered HTML and the first client render are
 * byte-identical. Without it, relative timestamps ("2h ago") would drift
 * between the two passes and trigger hydration mismatches.
 */
export const REFERENCE_NOW = new Date("2026-08-07T09:00:00.000Z");

export const STORAGE_KEY = "performancehub:state";

/** Bump to invalidate persisted state after a breaking shape change. */
export const STORAGE_VERSION = 1;

export const SCORE_WEIGHTS = {
  performance: 0.4,
  seo: 0.2,
  accessibility: 0.25,
  bestPractices: 0.15,
} as const;
