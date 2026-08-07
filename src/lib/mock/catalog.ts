import type { Effort, IssueCategory, Severity } from "@/types";

export interface IssueTemplate {
  ruleId: string;
  title: string;
  category: IssueCategory;
  severity: Severity;
  description: string;
  recommendation: string;
  /** Score points typically recovered by resolving this finding. */
  scoreImpact: number;
  effort: Effort;
  /** Page paths this rule tends to fire on. */
  pages: string[];
}

/**
 * Catalogue of realistic audit findings. Modelled on Lighthouse / axe rule
 * names so the mock data reads like a genuine report rather than lorem ipsum.
 */
export const ISSUE_TEMPLATES: IssueTemplate[] = [
  // ---------------------------------------------------------------- performance
  {
    ruleId: "render-blocking-resources",
    title: "Render-blocking resources delay first paint",
    category: "performance",
    severity: "critical",
    description:
      "Three stylesheets and one synchronous script are requested in the document head, blocking the first paint by an estimated 1.4s on a 4G connection.",
    recommendation:
      "Inline the critical CSS needed for above-the-fold content and defer the remainder with `media=\"print\" onload`. Move the analytics bundle behind `defer`.",
    scoreImpact: 12,
    effort: "medium",
    pages: ["/", "/pricing", "/blog"],
  },
  {
    ruleId: "unoptimized-images",
    title: "Images served in legacy formats",
    category: "performance",
    severity: "high",
    description:
      "42 images are served as PNG or JPEG where AVIF or WebP would cut transfer size by roughly 780 KB across the crawled pages.",
    recommendation:
      "Serve modern formats through a `<picture>` element or an image CDN, and generate responsive `srcset` variants at 1x/2x.",
    scoreImpact: 9,
    effort: "low",
    pages: ["/", "/products", "/gallery"],
  },
  {
    ruleId: "unused-javascript",
    title: "Large unused JavaScript bundle",
    category: "performance",
    severity: "high",
    description:
      "312 KB of parsed JavaScript is never executed on first load, most of it from a charting library imported at the route level.",
    recommendation:
      "Code-split the dashboard chart bundle behind a dynamic import and drop the polyfill bundle for modern browsers.",
    scoreImpact: 8,
    effort: "medium",
    pages: ["/", "/dashboard"],
  },
  {
    ruleId: "layout-shift",
    title: "Cumulative Layout Shift above threshold",
    category: "performance",
    severity: "high",
    description:
      "CLS measured at 0.24 against a 0.1 budget. The hero image and the cookie banner both inject without reserved space.",
    recommendation:
      "Set explicit `width`/`height` (or `aspect-ratio`) on media, and render the consent banner in a fixed overlay rather than in document flow.",
    scoreImpact: 7,
    effort: "low",
    pages: ["/", "/blog"],
  },
  {
    ruleId: "server-response-time",
    title: "Slow initial server response",
    category: "performance",
    severity: "medium",
    description:
      "Time to First Byte averages 780ms at the origin, well above the 600ms target, with the largest share spent on uncached database reads.",
    recommendation:
      "Add edge caching for anonymous traffic and memoise the navigation query that runs on every request.",
    scoreImpact: 6,
    effort: "high",
    pages: ["/", "/search"],
  },
  {
    ruleId: "font-display",
    title: "Web fonts block text rendering",
    category: "performance",
    severity: "medium",
    description:
      "Two self-hosted font families load without `font-display`, producing roughly 900ms of invisible text on slower connections.",
    recommendation:
      "Add `font-display: swap`, preload the primary weight, and subset the character set to the languages actually served.",
    scoreImpact: 4,
    effort: "low",
    pages: ["/", "/about"],
  },
  {
    ruleId: "long-main-thread-tasks",
    title: "Long main-thread tasks block interaction",
    category: "performance",
    severity: "medium",
    description:
      "Total Blocking Time of 640ms across six tasks longer than 50ms, dominated by hydration of the marketing carousel.",
    recommendation:
      "Defer hydration of below-the-fold widgets and break the carousel initialiser into `requestIdleCallback` chunks.",
    scoreImpact: 5,
    effort: "medium",
    pages: ["/"],
  },
  {
    ruleId: "no-text-compression",
    title: "Text assets served uncompressed",
    category: "performance",
    severity: "low",
    description:
      "Several JSON and SVG responses are served without Brotli or gzip, adding about 140 KB to the critical path.",
    recommendation:
      "Enable Brotli at the CDN for all `text/*`, `application/json` and `image/svg+xml` responses.",
    scoreImpact: 3,
    effort: "low",
    pages: ["/api/config", "/"],
  },

  // ----------------------------------------------------------------------- SEO
  {
    ruleId: "missing-meta-description",
    title: "Pages missing meta descriptions",
    category: "seo",
    severity: "medium",
    description:
      "18 indexable pages have no meta description, so search engines synthesise snippets from body copy.",
    recommendation:
      "Generate descriptions from page front-matter with a 150-160 character template and add a build-time check.",
    scoreImpact: 6,
    effort: "low",
    pages: ["/blog", "/blog/posts", "/docs"],
  },
  {
    ruleId: "duplicate-title-tags",
    title: "Duplicate title tags across templates",
    category: "seo",
    severity: "high",
    description:
      "11 pages share the title \"Home | Company\", which suppresses their individual ranking signals.",
    recommendation:
      "Derive titles from the page entity and enforce uniqueness in the metadata helper.",
    scoreImpact: 7,
    effort: "low",
    pages: ["/products", "/categories", "/collections"],
  },
  {
    ruleId: "broken-internal-links",
    title: "Broken internal links returning 404",
    category: "seo",
    severity: "high",
    description:
      "Nine internal links resolve to 404s, three of which sit in the primary footer navigation on every page.",
    recommendation:
      "Fix the footer routes and add a link-integrity check to CI using the generated sitemap.",
    scoreImpact: 8,
    effort: "low",
    pages: ["/", "/support", "/legal"],
  },
  {
    ruleId: "missing-canonical",
    title: "Missing canonical tags on paginated routes",
    category: "seo",
    severity: "medium",
    description:
      "Paginated listings expose the same content under multiple query strings without a canonical hint.",
    recommendation:
      "Emit a self-referencing canonical on page 1 and `rel=prev/next` metadata for deeper pages.",
    scoreImpact: 5,
    effort: "medium",
    pages: ["/blog?page=2", "/shop?page=3"],
  },
  {
    ruleId: "structured-data-invalid",
    title: "Invalid structured data markup",
    category: "seo",
    severity: "medium",
    description:
      "Product schema is missing required `priceCurrency` and `availability` fields, so rich results are suppressed.",
    recommendation:
      "Complete the JSON-LD payload from the product record and validate it against schema.org in CI.",
    scoreImpact: 4,
    effort: "medium",
    pages: ["/products", "/products/detail"],
  },
  {
    ruleId: "robots-blocking",
    title: "Robots directive blocks indexable content",
    category: "seo",
    severity: "critical",
    description:
      "A staging-era `noindex` header is still applied to the `/resources` subtree, removing 34 pages from the index.",
    recommendation:
      "Scope the `noindex` header to non-production hosts and request re-indexing through Search Console.",
    scoreImpact: 14,
    effort: "low",
    pages: ["/resources"],
  },
  {
    ruleId: "thin-alt-text",
    title: "Images missing descriptive alt text for search",
    category: "seo",
    severity: "low",
    description:
      "26 content images use filenames as alt text, providing no descriptive signal for image search.",
    recommendation:
      "Require an alt field in the CMS image component and backfill the existing library.",
    scoreImpact: 3,
    effort: "medium",
    pages: ["/blog", "/gallery"],
  },

  // -------------------------------------------------------------- accessibility
  {
    ruleId: "color-contrast",
    title: "Insufficient colour contrast",
    category: "accessibility",
    severity: "critical",
    description:
      "31 text nodes fall below the WCAG 2.1 AA 4.5:1 ratio, including the primary call-to-action and all secondary body copy.",
    recommendation:
      "Darken the muted foreground token to at least 4.5:1 against its background and add a contrast check to the design-token pipeline.",
    scoreImpact: 13,
    effort: "low",
    pages: ["/", "/pricing", "/contact"],
  },
  {
    ruleId: "form-labels",
    title: "Form inputs without accessible labels",
    category: "accessibility",
    severity: "critical",
    description:
      "Seven inputs across the checkout and newsletter forms rely on placeholders alone, leaving screen-reader users without a field name.",
    recommendation:
      "Associate every control with a `<label for>` and keep placeholders for format hints only.",
    scoreImpact: 11,
    effort: "low",
    pages: ["/checkout", "/contact", "/newsletter"],
  },
  {
    ruleId: "image-alt",
    title: "Images missing alt attributes",
    category: "accessibility",
    severity: "high",
    description:
      "14 informative images have no alt attribute, so their content is unavailable to assistive technology.",
    recommendation:
      "Add descriptive alt text for informative images and `alt=\"\"` for decorative ones.",
    scoreImpact: 8,
    effort: "low",
    pages: ["/", "/blog", "/team"],
  },
  {
    ruleId: "keyboard-trap",
    title: "Keyboard focus trapped in modal",
    category: "accessibility",
    severity: "high",
    description:
      "The newsletter modal cannot be dismissed with Escape and focus never returns to the trigger element.",
    recommendation:
      "Use a focus-managed dialog primitive that restores focus on close and handles Escape.",
    scoreImpact: 9,
    effort: "medium",
    pages: ["/", "/blog"],
  },
  {
    ruleId: "heading-order",
    title: "Non-sequential heading levels",
    category: "accessibility",
    severity: "medium",
    description:
      "Headings jump from `h1` to `h4` on marketing templates, breaking the document outline used for navigation.",
    recommendation:
      "Separate heading level from visual size — pick the level from document structure and style with utility classes.",
    scoreImpact: 5,
    effort: "low",
    pages: ["/", "/features"],
  },
  {
    ruleId: "aria-attributes",
    title: "Invalid ARIA attribute values",
    category: "accessibility",
    severity: "medium",
    description:
      "Custom dropdowns set `aria-expanded=\"1\"` instead of a boolean string, so state is announced incorrectly.",
    recommendation:
      "Replace bespoke widgets with accessible primitives, or emit \"true\"/\"false\" strings for boolean ARIA state.",
    scoreImpact: 4,
    effort: "medium",
    pages: ["/", "/docs"],
  },
  {
    ruleId: "focus-visible",
    title: "Focus indicator removed on interactive elements",
    category: "accessibility",
    severity: "medium",
    description:
      "A global `outline: none` reset removes the visible focus ring from links and buttons with no replacement.",
    recommendation:
      "Restore a `:focus-visible` ring with at least 3:1 contrast against adjacent colours.",
    scoreImpact: 6,
    effort: "low",
    pages: ["/", "/checkout"],
  },
  {
    ruleId: "link-name",
    title: "Links without discernible names",
    category: "accessibility",
    severity: "low",
    description:
      "Icon-only social links in the footer expose no accessible name to screen readers.",
    recommendation:
      "Add visually hidden text or an `aria-label` describing the link destination.",
    scoreImpact: 3,
    effort: "low",
    pages: ["/"],
  },

  // -------------------------------------------------------------- best practices
  {
    ruleId: "console-errors",
    title: "JavaScript errors logged to console",
    category: "best-practices",
    severity: "high",
    description:
      "Four uncaught TypeErrors fire on page load from a third-party chat widget, aborting its initialisation.",
    recommendation:
      "Pin the widget version, load it lazily and wrap initialisation in a guarded try/catch with reporting.",
    scoreImpact: 7,
    effort: "medium",
    pages: ["/", "/support"],
  },
  {
    ruleId: "deprecated-apis",
    title: "Deprecated browser APIs in use",
    category: "best-practices",
    severity: "medium",
    description:
      "`document.write` and synchronous XHR are still used by a legacy tag-manager snippet.",
    recommendation:
      "Migrate the snippet to the async tag loader and remove the synchronous fallback path.",
    scoreImpact: 4,
    effort: "medium",
    pages: ["/"],
  },
  {
    ruleId: "source-maps-exposed",
    title: "Production source maps publicly accessible",
    category: "best-practices",
    severity: "medium",
    description:
      "`.map` files for the application bundle are served from the CDN, exposing original source to anyone.",
    recommendation:
      "Upload source maps to the error tracker at build time and block `.map` requests at the edge.",
    scoreImpact: 3,
    effort: "low",
    pages: ["/_next/static"],
  },
  {
    ruleId: "third-party-cookies",
    title: "Third-party cookies set before consent",
    category: "best-practices",
    severity: "high",
    description:
      "Two marketing scripts write cookies on first load, before any consent choice has been recorded.",
    recommendation:
      "Gate non-essential tags behind the consent manager and default to denied for new visitors.",
    scoreImpact: 6,
    effort: "medium",
    pages: ["/"],
  },

  // ------------------------------------------------------------------ security
  {
    ruleId: "missing-csp",
    title: "No Content Security Policy header",
    category: "security",
    severity: "high",
    description:
      "Responses ship without a CSP, so injected inline script would execute unrestricted.",
    recommendation:
      "Roll out a nonce-based CSP in report-only mode, review violations, then enforce.",
    scoreImpact: 8,
    effort: "high",
    pages: ["/"],
  },
  {
    ruleId: "outdated-dependencies",
    title: "Front-end libraries with known vulnerabilities",
    category: "security",
    severity: "critical",
    description:
      "Two bundled libraries match public advisories, including a prototype-pollution issue in a date helper.",
    recommendation:
      "Upgrade the flagged packages, then add automated dependency scanning to the release pipeline.",
    scoreImpact: 10,
    effort: "medium",
    pages: ["/"],
  },
  {
    ruleId: "insecure-links",
    title: "External links missing rel=noopener",
    category: "security",
    severity: "low",
    description:
      "12 links open in a new tab without `rel=\"noopener\"`, granting the target partial access to the opener.",
    recommendation:
      "Add `rel=\"noopener noreferrer\"` in the shared link component for any `target=\"_blank\"`.",
    scoreImpact: 2,
    effort: "low",
    pages: ["/blog", "/partners"],
  },
  {
    ruleId: "mixed-content",
    title: "Mixed content requested over HTTP",
    category: "security",
    severity: "medium",
    description:
      "Three legacy image assets are requested over plain HTTP and are blocked by modern browsers.",
    recommendation:
      "Rewrite the asset URLs to HTTPS and add `upgrade-insecure-requests` to the CSP.",
    scoreImpact: 5,
    effort: "low",
    pages: ["/legacy", "/press"],
  },
];

/** Checks that pass on a healthy run, shown alongside findings in audit detail. */
export const PASSED_CHECKS: Record<IssueCategory, string[]> = {
  performance: [
    "Uses HTTP/2 for all resources",
    "Avoids enormous network payloads",
    "Preconnects to required origins",
    "Defers offscreen images",
    "Minifies CSS and JavaScript",
  ],
  seo: [
    "Document has a valid `hreflang`",
    "Page is mobile friendly",
    "Links are crawlable",
    "`robots.txt` is valid",
    "Document has a `<title>` element",
  ],
  accessibility: [
    "`[lang]` attribute has a valid value",
    "Lists contain only list items",
    "Document has one main landmark",
    "Buttons have an accessible name",
    "Tables use `<caption>` correctly",
  ],
  "best-practices": [
    "Uses HTTPS everywhere",
    "Displays images with correct aspect ratio",
    "Serves images with appropriate resolution",
    "Avoids requesting geolocation on load",
    "Page has a valid `doctype`",
  ],
  security: [
    "HSTS header present",
    "`X-Content-Type-Options` set to nosniff",
    "Cookies use the `Secure` flag",
    "No known malware signatures",
  ],
};
