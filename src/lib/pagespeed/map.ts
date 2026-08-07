import {
  CATEGORY_IDS,
  CRUX_METRIC_KEYS,
  LAB_AUDIT_IDS,
  type CruxCategory,
  type PsiAuditResult,
  type PsiLoadingExperience,
  type PsiResponse,
  type PsiStrategy,
} from "./types";
import type { IssueCategory, Scores, Severity } from "@/types";

/**
 * Maps a PageSpeed Insights response onto this product's domain shapes.
 *
 * The rule throughout: if Google did not report something, it is `null` or
 * omitted. Nothing here invents a score, a metric or a finding — a missing
 * value must surface in the UI as "not reported", never as a plausible number.
 */

/** Lab metrics, straight from Lighthouse. Milliseconds unless noted. */
export interface LabMetrics {
  lcpMs: number | null;
  fcpMs: number | null;
  /** Unitless. */
  cls: number | null;
  tbtMs: number | null;
  ttfbMs: number | null;
  speedIndexMs: number | null;
  interactiveMs: number | null;
}

/** Real-user (CrUX) metrics. Absent for sites without enough traffic. */
export interface FieldMetrics {
  available: boolean;
  /** Whether the data describes this URL or the whole origin. */
  scope: "url" | "origin" | null;
  overallCategory: CruxCategory | null;
  lcpMs: number | null;
  inpMs: number | null;
  cls: number | null;
  fcpMs: number | null;
  ttfbMs: number | null;
  categories: {
    lcp: CruxCategory | null;
    inp: CruxCategory | null;
    cls: CruxCategory | null;
    fcp: CruxCategory | null;
    ttfb: CruxCategory | null;
  };
}

export type FindingKind = "opportunity" | "diagnostic";

export interface MappedFinding {
  ruleId: string;
  title: string;
  description: string;
  /** Lighthouse's own summary, e.g. "Potential savings of 1.2 s". */
  displayValue: string | null;
  category: IssueCategory;
  severity: Severity;
  kind: FindingKind;
  /** Estimated milliseconds saved, when Lighthouse reports it. */
  savingsMs: number | null;
  /** Points this category would gain if the audit passed outright. */
  scoreImpact: number;
  /** Specific resources Lighthouse flagged, capped for storage. */
  affectedResources: string[];
}

export interface MappedAudit {
  requestedUrl: string | null;
  finalUrl: string | null;
  strategy: PsiStrategy;
  lighthouseVersion: string | null;
  /** When Google ran the analysis, not when we stored it. */
  analysedAt: string | null;
  scores: Partial<Scores>;
  lab: LabMetrics;
  field: FieldMetrics;
  findings: MappedFinding[];
  /** Titles of audits that passed, for the "verified healthy" list. */
  passedChecks: string[];
  passedCount: number;
  totalCount: number;
  runWarnings: string[];
}

/** Lighthouse scores are 0-1; the product displays 0-100. */
function toScore100(score: number | null | undefined): number | null {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  return Math.round(score * 100);
}

function numeric(audit: PsiAuditResult | undefined): number | null {
  const value = audit?.numericValue;
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

export function mapLabMetrics(psi: PsiResponse): LabMetrics {
  const audits = psi.lighthouseResult?.audits ?? {};

  return {
    lcpMs: numeric(audits[LAB_AUDIT_IDS.lcp]),
    fcpMs: numeric(audits[LAB_AUDIT_IDS.fcp]),
    cls: numeric(audits[LAB_AUDIT_IDS.cls]),
    tbtMs: numeric(audits[LAB_AUDIT_IDS.tbt]),
    ttfbMs: numeric(audits[LAB_AUDIT_IDS.ttfb]),
    speedIndexMs: numeric(audits[LAB_AUDIT_IDS.speedIndex]),
    interactiveMs: numeric(audits[LAB_AUDIT_IDS.interactive]),
  };
}

const EMPTY_FIELD: FieldMetrics = {
  available: false,
  scope: null,
  overallCategory: null,
  lcpMs: null,
  inpMs: null,
  cls: null,
  fcpMs: null,
  ttfbMs: null,
  categories: { lcp: null, inp: null, cls: null, fcp: null, ttfb: null },
};

function readExperience(
  experience: PsiLoadingExperience | undefined,
  scope: "url" | "origin",
): FieldMetrics | null {
  const metrics = experience?.metrics;
  if (!metrics || Object.keys(metrics).length === 0) return null;

  const percentile = (key: string): number | null => {
    const value = metrics[key]?.percentile;
    return typeof value === "number" ? value : null;
  };
  const category = (key: string): CruxCategory | null =>
    metrics[key]?.category ?? null;

  const clsRaw = percentile(CRUX_METRIC_KEYS.cls);

  return {
    available: true,
    scope,
    overallCategory: experience?.overall_category ?? null,
    lcpMs: percentile(CRUX_METRIC_KEYS.lcp),
    inpMs: percentile(CRUX_METRIC_KEYS.inp),
    // CrUX reports CLS multiplied by 100 as an integer.
    cls: clsRaw === null ? null : clsRaw / 100,
    fcpMs: percentile(CRUX_METRIC_KEYS.fcp),
    ttfbMs: percentile(CRUX_METRIC_KEYS.ttfb),
    categories: {
      lcp: category(CRUX_METRIC_KEYS.lcp),
      inp: category(CRUX_METRIC_KEYS.inp),
      cls: category(CRUX_METRIC_KEYS.cls),
      fcp: category(CRUX_METRIC_KEYS.fcp),
      ttfb: category(CRUX_METRIC_KEYS.ttfb),
    },
  };
}

/**
 * Prefers URL-level field data, falling back to origin-level.
 *
 * Both are real CrUX data but they describe different things, so the scope is
 * carried through and shown in the UI rather than being quietly conflated.
 */
export function mapFieldMetrics(psi: PsiResponse): FieldMetrics {
  return (
    readExperience(psi.loadingExperience, "url") ??
    readExperience(psi.originLoadingExperience, "origin") ??
    EMPTY_FIELD
  );
}

const CATEGORY_FOR_LIGHTHOUSE: Record<string, IssueCategory> = {
  performance: "performance",
  accessibility: "accessibility",
  seo: "seo",
  "best-practices": "best-practices",
};

/**
 * Builds a lookup of audit id to the category it belongs to and its weight
 * within that category, so a finding can be attributed accurately.
 */
function buildAuditIndex(psi: PsiResponse) {
  const index = new Map<
    string,
    { category: IssueCategory; weight: number; categoryWeightTotal: number }
  >();

  for (const [lhId, category] of Object.entries(
    psi.lighthouseResult?.categories ?? {},
  )) {
    const mapped = CATEGORY_FOR_LIGHTHOUSE[lhId];
    if (!mapped || !category?.auditRefs) continue;

    const total = category.auditRefs.reduce(
      (sum, ref) => sum + (ref.weight ?? 0),
      0,
    );

    for (const ref of category.auditRefs) {
      if (!ref.id) continue;
      index.set(ref.id, {
        category: mapped,
        weight: ref.weight ?? 0,
        categoryWeightTotal: total,
      });
    }
  }

  return index;
}

/**
 * Severity from Lighthouse's own scoring bands, sharpened by impact.
 *
 * Lighthouse treats below 0.5 as failing and 0.5-0.89 as needing improvement.
 * A failing audit that also carries real weight in its category, or a large
 * measured saving, is the one worth calling critical.
 */
export function severityFor(
  score: number,
  weightShare: number,
  savingsMs: number | null,
): Severity {
  if (score < 0.5) {
    if (weightShare >= 0.1 || (savingsMs ?? 0) >= 1000) return "critical";
    return "high";
  }
  if (score < 0.9) {
    if (weightShare >= 0.15 || (savingsMs ?? 0) >= 2000) return "high";
    return "medium";
  }
  return "low";
}

/**
 * Milliseconds Lighthouse estimates fixing this audit would save.
 *
 * Two shapes have to be read. Classic opportunity audits carry
 * `details.overallSavingsMs`; the `*-insight` audits introduced in Lighthouse
 * 13 instead report per-metric savings under `metricSavings`. Reading only the
 * former silently loses the saving on every insight audit, which on a modern
 * report is most of the actionable performance advice.
 *
 * The largest per-metric saving is used, since the metrics overlap and summing
 * them would overstate the benefit.
 */
export function savingsMsFor(audit: PsiAuditResult): number | null {
  const direct = audit.details?.overallSavingsMs;
  if (typeof direct === "number" && direct > 0) return Math.round(direct);

  const perMetric = Object.values(audit.metricSavings ?? {}).filter(
    (value): value is number => typeof value === "number" && value > 0,
  );
  if (perMetric.length > 0) return Math.round(Math.max(...perMetric));

  return null;
}

/** Pulls the URLs Lighthouse flagged, so a finding points at real resources. */
function affectedResources(audit: PsiAuditResult): string[] {
  const items = audit.details?.items;
  if (!Array.isArray(items)) return [];

  const urls: string[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const candidate = (item as { url?: unknown }).url;
    if (typeof candidate === "string" && candidate.startsWith("http")) {
      urls.push(candidate);
    }
    if (urls.length >= 10) break;
  }
  return urls;
}

/**
 * Every failing or partially failing audit becomes a finding.
 *
 * `notApplicable`, `informative` and `manual` audits are skipped: Lighthouse
 * does not score them, so calling them findings would report a problem Google
 * never reported.
 */
export function mapFindings(psi: PsiResponse): MappedFinding[] {
  const audits = psi.lighthouseResult?.audits ?? {};
  const index = buildAuditIndex(psi);
  const findings: MappedFinding[] = [];

  for (const [id, audit] of Object.entries(audits)) {
    if (!audit) continue;

    const mode = audit.scoreDisplayMode;
    if (mode === "notApplicable" || mode === "informative" || mode === "manual") {
      continue;
    }
    if (typeof audit.score !== "number") continue;
    if (audit.score >= 0.9) continue; // passing

    const meta = index.get(id);
    if (!meta) continue; // not part of a category we display

    const weightShare =
      meta.categoryWeightTotal > 0 ? meta.weight / meta.categoryWeightTotal : 0;

    const savingsMs = savingsMsFor(audit);

    // A category score is the weighted mean of its audits, so the points
    // recoverable by fixing this one are exactly its weighted shortfall.
    const scoreImpact = Math.round(weightShare * (1 - audit.score) * 100);

    findings.push({
      ruleId: id,
      title: audit.title ?? id,
      description: audit.description ?? "",
      displayValue: audit.displayValue ?? null,
      category: meta.category,
      severity: severityFor(audit.score, weightShare, savingsMs),
      kind: savingsMs !== null && savingsMs > 0 ? "opportunity" : "diagnostic",
      savingsMs,
      scoreImpact,
      affectedResources: affectedResources(audit),
    });
  }

  // Highest impact first, so the list is ordered by what actually moves scores.
  return findings.sort((a, b) => {
    if (b.scoreImpact !== a.scoreImpact) return b.scoreImpact - a.scoreImpact;
    return (b.savingsMs ?? 0) - (a.savingsMs ?? 0);
  });
}

/** Audits Lighthouse scored as passing, used for the "verified healthy" list. */
export function mapPassedChecks(psi: PsiResponse): string[] {
  const audits = psi.lighthouseResult?.audits ?? {};
  const index = buildAuditIndex(psi);
  const passed: string[] = [];

  for (const [id, audit] of Object.entries(audits)) {
    if (!audit || !index.has(id)) continue;
    if (typeof audit.score !== "number" || audit.score < 0.9) continue;
    const mode = audit.scoreDisplayMode;
    if (mode === "notApplicable" || mode === "informative" || mode === "manual") {
      continue;
    }
    passed.push(audit.title ?? id);
  }

  return passed.sort((a, b) => a.localeCompare(b));
}

export function mapScores(psi: PsiResponse): Partial<Scores> {
  const categories = psi.lighthouseResult?.categories ?? {};
  const scores: Partial<Scores> = {};

  const performance = toScore100(categories[CATEGORY_IDS.performance]?.score);
  const accessibility = toScore100(categories[CATEGORY_IDS.accessibility]?.score);
  const seo = toScore100(categories[CATEGORY_IDS.seo]?.score);
  const bestPractices = toScore100(categories[CATEGORY_IDS.bestPractices]?.score);

  if (performance !== null) scores.performance = performance;
  if (accessibility !== null) scores.accessibility = accessibility;
  if (seo !== null) scores.seo = seo;
  if (bestPractices !== null) scores.bestPractices = bestPractices;

  return scores;
}

export function mapPageSpeedResponse(
  psi: PsiResponse,
  strategy: PsiStrategy,
): MappedAudit {
  const lighthouse = psi.lighthouseResult;
  const findings = mapFindings(psi);
  const passedChecks = mapPassedChecks(psi);

  return {
    requestedUrl: lighthouse?.requestedUrl ?? null,
    finalUrl:
      lighthouse?.finalDisplayedUrl ??
      lighthouse?.finalUrl ??
      lighthouse?.mainDocumentUrl ??
      null,
    strategy,
    lighthouseVersion: lighthouse?.lighthouseVersion ?? null,
    analysedAt: lighthouse?.fetchTime ?? psi.analysisUTCTimestamp ?? null,
    scores: mapScores(psi),
    lab: mapLabMetrics(psi),
    field: mapFieldMetrics(psi),
    findings,
    passedChecks,
    passedCount: passedChecks.length,
    totalCount: passedChecks.length + findings.length,
    runWarnings: lighthouse?.runWarnings ?? [],
  };
}
