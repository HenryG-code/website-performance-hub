/**
 * Typed subset of the PageSpeed Insights v5 response.
 *
 * Only the fields this application reads are declared. The response is huge and
 * Google adds to it freely, so everything is optional and the mapper treats a
 * missing field as "not reported" rather than assuming a shape.
 */

export type PsiStrategy = "mobile" | "desktop";

/** Google's own bucketing of a field metric. */
export type CruxCategory = "FAST" | "AVERAGE" | "SLOW" | "NONE";

export interface PsiAuditRef {
  id?: string;
  weight?: number;
  group?: string;
}

export interface PsiCategory {
  id?: string;
  title?: string;
  /** 0–1, or null when Lighthouse could not score the category. */
  score?: number | null;
  auditRefs?: PsiAuditRef[];
}

export interface PsiAuditResult {
  id?: string;
  title?: string;
  description?: string;
  /** 0–1, or null for informative audits that are not scored. */
  score?: number | null;
  scoreDisplayMode?: string;
  displayValue?: string;
  numericValue?: number;
  numericUnit?: string;
  /**
   * Per-metric savings, keyed by metric acronym (`LCP`, `FCP`, `CLS`, `INP`,
   * `TBT`). Lighthouse 13 reports savings here for its `*-insight` audits
   * instead of the older `details.overallSavingsMs`, so both must be read.
   */
  metricSavings?: Record<string, number | undefined>;
  details?: {
    type?: string;
    /** Estimated milliseconds saved, on classic opportunity audits. */
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
    items?: unknown[];
    headings?: unknown[];
  };
}

export interface PsiLighthouseResult {
  requestedUrl?: string;
  finalUrl?: string;
  finalDisplayedUrl?: string;
  mainDocumentUrl?: string;
  lighthouseVersion?: string;
  fetchTime?: string;
  userAgent?: string;
  categories?: Record<string, PsiCategory | undefined>;
  audits?: Record<string, PsiAuditResult | undefined>;
  configSettings?: { formFactor?: string; emulatedFormFactor?: string };
  timing?: { total?: number };
  runtimeError?: { code?: string; message?: string };
  runWarnings?: string[];
}

export interface PsiFieldMetric {
  percentile?: number;
  category?: CruxCategory;
  distributions?: { min?: number; max?: number; proportion?: number }[];
}

/**
 * CrUX field data. Present only when Google has enough real-user traffic for
 * the origin or URL — absent for low-traffic sites, which is common.
 */
export interface PsiLoadingExperience {
  id?: string;
  metrics?: Record<string, PsiFieldMetric | undefined>;
  overall_category?: CruxCategory;
  initial_url?: string;
}

export interface PsiResponse {
  id?: string;
  analysisUTCTimestamp?: string;
  lighthouseResult?: PsiLighthouseResult;
  loadingExperience?: PsiLoadingExperience;
  originLoadingExperience?: PsiLoadingExperience;
  error?: { code?: number; message?: string; status?: string };
}

/** CrUX metric keys, which are SCREAMING_SNAKE unlike the Lighthouse ones. */
export const CRUX_METRIC_KEYS = {
  lcp: "LARGEST_CONTENTFUL_PAINT_MS",
  inp: "INTERACTION_TO_NEXT_PAINT",
  cls: "CUMULATIVE_LAYOUT_SHIFT_SCORE",
  fcp: "FIRST_CONTENTFUL_PAINT_MS",
  ttfb: "EXPERIMENTAL_TIME_TO_FIRST_BYTE",
} as const;

/** Lighthouse audit ids for the lab metrics shown in the UI. */
export const LAB_AUDIT_IDS = {
  lcp: "largest-contentful-paint",
  fcp: "first-contentful-paint",
  cls: "cumulative-layout-shift",
  tbt: "total-blocking-time",
  ttfb: "server-response-time",
  speedIndex: "speed-index",
  interactive: "interactive",
} as const;

/** Lighthouse category ids mapped onto this product's four score keys. */
export const CATEGORY_IDS = {
  performance: "performance",
  accessibility: "accessibility",
  seo: "seo",
  bestPractices: "best-practices",
} as const;
