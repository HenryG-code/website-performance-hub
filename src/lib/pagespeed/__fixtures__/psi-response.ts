import type { PsiResponse } from "../types";

/**
 * Trimmed PageSpeed Insights responses used by the mapper tests.
 *
 * The shapes mirror real v5 payloads exactly — the same nesting, the same
 * `scoreDisplayMode` values, the same CrUX metric keys and the CLS-times-100
 * encoding — with only the audit list cut down to the cases worth asserting on.
 */

/** A run with both Lighthouse results and CrUX field data. */
export const psiWithFieldData: PsiResponse = {
  analysisUTCTimestamp: "2026-08-07T12:34:56.789Z",
  loadingExperience: {
    id: "https://example.com/",
    overall_category: "AVERAGE",
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 3200, category: "AVERAGE" },
      INTERACTION_TO_NEXT_PAINT: { percentile: 180, category: "FAST" },
      // CrUX reports CLS multiplied by 100.
      CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 12, category: "AVERAGE" },
      FIRST_CONTENTFUL_PAINT_MS: { percentile: 1600, category: "FAST" },
      EXPERIMENTAL_TIME_TO_FIRST_BYTE: { percentile: 900, category: "AVERAGE" },
    },
  },
  lighthouseResult: {
    requestedUrl: "https://example.com",
    finalUrl: "https://example.com/",
    finalDisplayedUrl: "https://example.com/",
    lighthouseVersion: "12.2.1",
    fetchTime: "2026-08-07T12:34:00.000Z",
    categories: {
      performance: {
        id: "performance",
        score: 0.64,
        auditRefs: [
          { id: "largest-contentful-paint", weight: 25 },
          { id: "total-blocking-time", weight: 30 },
          { id: "render-blocking-resources", weight: 0 },
          { id: "uses-responsive-images", weight: 0 },
          { id: "server-response-time", weight: 0 },
          { id: "render-blocking-insight", weight: 0 },
          { id: "image-delivery-insight", weight: 0 },
        ],
      },
      accessibility: {
        id: "accessibility",
        score: 0.87,
        auditRefs: [
          { id: "color-contrast", weight: 7 },
          { id: "image-alt", weight: 10 },
          { id: "html-has-lang", weight: 3 },
        ],
      },
      seo: {
        id: "seo",
        score: 0.92,
        auditRefs: [{ id: "meta-description", weight: 1 }],
      },
      "best-practices": {
        id: "best-practices",
        score: 0.75,
        auditRefs: [{ id: "errors-in-console", weight: 1 }],
      },
    },
    audits: {
      "largest-contentful-paint": {
        id: "largest-contentful-paint",
        title: "Largest Contentful Paint",
        score: 0.42,
        scoreDisplayMode: "numeric",
        displayValue: "4.1 s",
        numericValue: 4100,
      },
      "total-blocking-time": {
        id: "total-blocking-time",
        title: "Total Blocking Time",
        score: 0.55,
        scoreDisplayMode: "numeric",
        numericValue: 480,
      },
      "first-contentful-paint": {
        id: "first-contentful-paint",
        title: "First Contentful Paint",
        score: 0.8,
        scoreDisplayMode: "numeric",
        numericValue: 1900,
      },
      "cumulative-layout-shift": {
        id: "cumulative-layout-shift",
        title: "Cumulative Layout Shift",
        score: 0.95,
        scoreDisplayMode: "numeric",
        numericValue: 0.06,
      },
      "speed-index": {
        id: "speed-index",
        title: "Speed Index",
        score: 0.7,
        scoreDisplayMode: "numeric",
        numericValue: 3400,
      },
      "server-response-time": {
        id: "server-response-time",
        title: "Initial server response time was short",
        score: 0.3,
        scoreDisplayMode: "binary",
        displayValue: "Root document took 1,200 ms",
        numericValue: 1200,
      },
      "render-blocking-resources": {
        id: "render-blocking-resources",
        title: "Eliminate render-blocking resources",
        description: "Resources are blocking the first paint of your page.",
        score: 0.35,
        scoreDisplayMode: "numeric",
        displayValue: "Potential savings of 1,180 ms",
        details: {
          type: "opportunity",
          overallSavingsMs: 1180,
          items: [
            { url: "https://example.com/app.css", wastedMs: 700 },
            { url: "https://example.com/vendor.js", wastedMs: 480 },
            { notAUrl: true },
          ],
        },
      },
      "uses-responsive-images": {
        id: "uses-responsive-images",
        title: "Properly size images",
        score: 0.8,
        scoreDisplayMode: "numeric",
        details: { type: "opportunity", overallSavingsMs: 300 },
      },
      "color-contrast": {
        id: "color-contrast",
        title: "Background and foreground colors have a sufficient contrast ratio",
        score: 0,
        scoreDisplayMode: "binary",
      },
      /*
       * Lighthouse 13 "insight" audit. Note the shape: no
       * `details.overallSavingsMs`, savings reported per metric instead, and a
       * `metricSavings` score display mode. Captured from a real report.
       */
      "render-blocking-insight": {
        id: "render-blocking-insight",
        title: "Render blocking requests",
        score: 0,
        scoreDisplayMode: "metricSavings",
        displayValue: "Est savings of 450 ms",
        metricSavings: { LCP: 450, FCP: 450 },
        details: { type: "table" },
      },
      "image-delivery-insight": {
        id: "image-delivery-insight",
        title: "Improve image delivery",
        score: 0.5,
        scoreDisplayMode: "metricSavings",
        displayValue: "Est savings of 178 KiB",
        // Reports a byte saving but no time saving.
        metricSavings: { LCP: 0, FCP: 0 },
        details: { type: "table" },
      },
      "image-alt": {
        id: "image-alt",
        title: "Image elements have [alt] attributes",
        score: 1,
        scoreDisplayMode: "binary",
      },
      "html-has-lang": {
        id: "html-has-lang",
        title: "<html> element has a [lang] attribute",
        score: 1,
        scoreDisplayMode: "binary",
      },
      "meta-description": {
        id: "meta-description",
        title: "Document has a meta description",
        score: 1,
        scoreDisplayMode: "binary",
      },
      "errors-in-console": {
        id: "errors-in-console",
        title: "No browser errors logged to the console",
        score: 0,
        scoreDisplayMode: "binary",
      },
      // Must never become a finding: Lighthouse did not score it.
      "screenshot-thumbnails": {
        id: "screenshot-thumbnails",
        title: "Screenshot Thumbnails",
        score: null,
        scoreDisplayMode: "informative",
      },
      "canonical-check": {
        id: "canonical-check",
        title: "Document has a valid rel=canonical",
        score: null,
        scoreDisplayMode: "notApplicable",
      },
    },
  },
};

/** A low-traffic site: Lighthouse results, but no CrUX data at all. */
export const psiWithoutFieldData: PsiResponse = {
  lighthouseResult: {
    requestedUrl: "https://tiny.example.com",
    finalUrl: "https://tiny.example.com/",
    lighthouseVersion: "12.2.1",
    fetchTime: "2026-08-07T09:00:00.000Z",
    categories: {
      performance: { id: "performance", score: 0.98, auditRefs: [] },
      accessibility: { id: "accessibility", score: 1, auditRefs: [] },
      seo: { id: "seo", score: 1, auditRefs: [] },
      "best-practices": { id: "best-practices", score: 1, auditRefs: [] },
    },
    audits: {
      "largest-contentful-paint": {
        id: "largest-contentful-paint",
        title: "Largest Contentful Paint",
        score: 1,
        numericValue: 900,
        scoreDisplayMode: "numeric",
      },
    },
  },
};

/**
 * Origin-level CrUX only. Google reports this when it has traffic for the
 * domain but not for the specific URL.
 */
export const psiWithOriginFieldData: PsiResponse = {
  originLoadingExperience: {
    id: "https://origin.example.com",
    overall_category: "FAST",
    metrics: {
      LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2100, category: "FAST" },
    },
  },
  lighthouseResult: {
    requestedUrl: "https://origin.example.com/deep/page",
    finalUrl: "https://origin.example.com/deep/page",
    lighthouseVersion: "12.2.1",
    categories: {
      performance: { id: "performance", score: 0.9, auditRefs: [] },
    },
    audits: {},
  },
};
