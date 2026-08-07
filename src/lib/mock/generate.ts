import { REFERENCE_NOW } from "@/lib/constants";
import { healthScore } from "@/lib/scores";
import type {
  Audit,
  AuditStatus,
  Issue,
  IssueStatus,
  ScoreKey,
  Scores,
  TrendPoint,
  UptimeDay,
  WebVitals,
  Website,
} from "@/types";

/**
 * Demo dataset used by the development seed action.
 *
 * Phase 1 rendered this straight into the UI. It is now only a source of
 * plausible rows to write into Postgres for a development account — the app
 * itself always reads real data.
 */
export interface SeedDataset {
  websites: Website[];
  audits: Audit[];
  issues: Issue[];
  trends: Record<string, TrendPoint[]>;
  uptime: Record<string, UptimeDay[]>;
}
import { ISSUE_TEMPLATES, type IssueTemplate } from "./catalog";
import { clamp, createRng, hashSeed, type Rng } from "./random";

const DAY_MS = 86_400_000;
const TREND_DAYS = 90;
const UPTIME_DAYS = 30;

interface SiteSeed {
  id: string;
  name: string;
  url: string;
  initials: string;
  team: string;
  environment: Website["environment"];
  tags: string[];
  status: Website["status"];
  /** Current-day scores; history is generated backwards from these. */
  base: Scores;
  /** Points gained (positive) or lost (negative) across the 90-day window. */
  drift: Partial<Scores>;
  uptime30d: number;
  avgResponseMs: number;
}

const SITE_SEEDS: SiteSeed[] = [
  {
    id: "wsite-northwind",
    name: "Northwind Commerce",
    url: "https://www.northwind-commerce.com",
    initials: "NC",
    team: "E-commerce",
    environment: "production",
    tags: ["revenue", "storefront"],
    status: "operational",
    base: { performance: 62, seo: 88, accessibility: 74, bestPractices: 83 },
    drift: { performance: 9, accessibility: 6 },
    uptime30d: 99.94,
    avgResponseMs: 412,
  },
  {
    id: "wsite-atlas",
    name: "Atlas Analytics",
    url: "https://atlasanalytics.io",
    initials: "AA",
    team: "Marketing",
    environment: "production",
    tags: ["marketing", "lead-gen"],
    status: "operational",
    base: { performance: 91, seo: 96, accessibility: 93, bestPractices: 95 },
    drift: { performance: 5, seo: 3 },
    uptime30d: 99.99,
    avgResponseMs: 186,
  },
  {
    id: "wsite-meridian",
    name: "Meridian Docs",
    url: "https://docs.meridianhq.com",
    initials: "MD",
    team: "Developer Experience",
    environment: "production",
    tags: ["docs", "public"],
    status: "operational",
    base: { performance: 87, seo: 91, accessibility: 88, bestPractices: 90 },
    drift: { performance: -4, accessibility: 4 },
    uptime30d: 99.97,
    avgResponseMs: 224,
  },
  {
    id: "wsite-vertex",
    name: "Vertex Support Center",
    url: "https://support.vertexcloud.com",
    initials: "VS",
    team: "Customer Success",
    environment: "production",
    tags: ["support", "help-center"],
    status: "degraded",
    base: { performance: 54, seo: 71, accessibility: 63, bestPractices: 72 },
    drift: { performance: -11, seo: -6, accessibility: -3 },
    uptime30d: 99.21,
    avgResponseMs: 878,
  },
  {
    id: "wsite-lumen",
    name: "Lumen Labs Blog",
    url: "https://blog.lumenlabs.dev",
    initials: "LL",
    team: "Content",
    environment: "production",
    tags: ["content", "seo"],
    status: "operational",
    base: { performance: 78, seo: 94, accessibility: 81, bestPractices: 86 },
    drift: { performance: 12, seo: 4 },
    uptime30d: 99.88,
    avgResponseMs: 341,
  },
  {
    id: "wsite-harbor",
    name: "Harbor Bank Portal",
    url: "https://portal.harborbank.co",
    initials: "HB",
    team: "Digital Banking",
    environment: "production",
    tags: ["regulated", "authenticated"],
    status: "operational",
    base: { performance: 69, seo: 64, accessibility: 91, bestPractices: 88 },
    drift: { performance: 7, accessibility: 11 },
    uptime30d: 99.99,
    avgResponseMs: 296,
  },
  {
    id: "wsite-solstice",
    name: "Solstice Careers",
    url: "https://careers.solstice.design",
    initials: "SC",
    team: "People Ops",
    environment: "production",
    tags: ["careers", "low-traffic"],
    status: "operational",
    base: { performance: 84, seo: 79, accessibility: 76, bestPractices: 81 },
    drift: { seo: -8, accessibility: 5 },
    uptime30d: 99.72,
    avgResponseMs: 508,
  },
  {
    id: "wsite-kestrel",
    name: "Kestrel App (Staging)",
    url: "https://staging.kestrelapp.com",
    initials: "KA",
    team: "Platform",
    environment: "staging",
    tags: ["staging", "pre-release"],
    status: "degraded",
    base: { performance: 47, seo: 58, accessibility: 69, bestPractices: 66 },
    drift: { performance: -6, bestPractices: -9 },
    uptime30d: 97.84,
    avgResponseMs: 1140,
  },
];

const SCORE_KEYS: ScoreKey[] = [
  "performance",
  "seo",
  "accessibility",
  "bestPractices",
];

function isoDay(daysAgo: number): string {
  return new Date(REFERENCE_NOW.getTime() - daysAgo * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/**
 * Builds the daily score history for one site by walking backwards from its
 * current scores, removing the drift and layering deterministic noise.
 */
function buildTrend(seed: SiteSeed, rng: Rng): TrendPoint[] {
  const points: TrendPoint[] = [];

  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    // progress: 0 at the oldest point, 1 today.
    const progress = (TREND_DAYS - 1 - i) / (TREND_DAYS - 1);
    const scores = {} as Scores;

    for (const key of SCORE_KEYS) {
      const totalDrift = seed.drift[key] ?? 0;
      // Ease the drift so history curves rather than moving in a straight line.
      const eased = totalDrift * (progress * progress * (3 - 2 * progress));
      const noise = rng.float(-2.2, 2.2);
      scores[key] = Math.round(
        clamp(seed.base[key] - totalDrift + eased + noise, 18, 100),
      );
    }

    points.push({
      date: isoDay(i),
      ...scores,
      health: healthScore(scores),
    });
  }

  // Pin the final point to the site's headline scores so cards and charts agree.
  const last = points[points.length - 1];
  for (const key of SCORE_KEYS) last[key] = seed.base[key];
  last.health = healthScore(seed.base);

  return points;
}

function buildUptime(seed: SiteSeed, rng: Rng): UptimeDay[] {
  const days: UptimeDay[] = [];
  // Distribute the site's monthly downtime budget across a handful of days.
  const downtimeBudget = (100 - seed.uptime30d) * UPTIME_DAYS;
  let remaining = downtimeBudget;

  for (let i = UPTIME_DAYS - 1; i >= 0; i--) {
    const isIncidentDay = remaining > 0.05 && rng.chance(0.18);
    const loss = isIncidentDay
      ? Math.min(remaining, rng.float(0.2, Math.max(0.25, remaining * 0.6)))
      : 0;
    remaining -= loss;

    days.push({
      date: isoDay(i),
      uptime: Math.round((100 - loss) * 100) / 100,
      avgResponseMs: Math.round(seed.avgResponseMs * rng.float(0.82, 1.24)),
      incidents: loss > 0 ? rng.int(1, 2) : 0,
    });
  }

  return days;
}

/** Derives plausible lab metrics from a performance score. */
export function vitalsFromScore(performance: number, rng: Rng): WebVitals {
  // Higher score -> lower timings. `slack` is 0 for a perfect score, 1 for a poor one.
  const slack = clamp((100 - performance) / 60, 0, 1.4);
  return {
    lcp: Math.round((1.1 + slack * 3.4 + rng.float(-0.15, 0.25)) * 10) / 10,
    fcp: Math.round((0.7 + slack * 1.8 + rng.float(-0.1, 0.2)) * 10) / 10,
    cls: Math.round((0.01 + slack * 0.22 + rng.float(-0.005, 0.02)) * 1000) / 1000,
    inp: Math.round(80 + slack * 420 + rng.float(-20, 40)),
    ttfb: Math.round(140 + slack * 720 + rng.float(-30, 60)),
    tbt: Math.round(30 + slack * 780 + rng.float(-20, 60)),
    speedIndex: Math.round((1.3 + slack * 4.1 + rng.float(-0.2, 0.3)) * 10) / 10,
  };
}

function scoresAtDay(trend: TrendPoint[], daysAgo: number): Scores {
  const index = clamp(trend.length - 1 - daysAgo, 0, trend.length - 1);
  const point = trend[index];
  return {
    performance: point.performance,
    seo: point.seo,
    accessibility: point.accessibility,
    bestPractices: point.bestPractices,
  };
}

interface BuiltSite {
  website: Website;
  audits: Audit[];
  issues: Issue[];
  trend: TrendPoint[];
  uptime: UptimeDay[];
}

function buildSite(seed: SiteSeed, siteIndex: number): BuiltSite {
  const rng = createRng(hashSeed(seed.id));
  const trend = buildTrend(seed, rng);
  const uptime = buildUptime(seed, rng);

  // ---------------------------------------------------------------- audits
  const audits: Audit[] = [];
  let daysAgo = rng.int(0, 2);
  let sequence = 0;

  while (daysAgo < TREND_DAYS - 2) {
    const scores = scoresAtDay(trend, daysAgo);
    // Roughly a third of runs use the mobile profile, mixed through the history
    // rather than landing on a fixed cadence.
    const device: Audit["device"] = rng.chance(0.34) ? "mobile" : "desktop";

    // Mobile runs score lower on performance, as they do in real Lighthouse runs.
    const adjusted: Scores = {
      ...scores,
      performance:
        device === "mobile"
          ? Math.round(clamp(scores.performance - rng.int(8, 16), 15, 100))
          : scores.performance,
    };

    let status: AuditStatus = "completed";
    let failureReason: string | undefined;
    // A couple of historical runs failed, to exercise the status filter.
    if (daysAgo > 4 && rng.chance(0.07)) {
      status = "failed";
      failureReason = rng.pick([
        "Navigation timeout after 45s — the origin did not respond.",
        "TLS handshake failed: certificate chain could not be verified.",
        "Crawler blocked by bot protection (HTTP 403).",
      ]);
    }

    const startedAt = new Date(
      REFERENCE_NOW.getTime() - daysAgo * DAY_MS - rng.int(0, 20) * 3_600_000,
    ).toISOString();

    const totalChecks = rng.int(84, 112);
    const health = healthScore(adjusted);

    audits.push({
      id: `audit-${seed.id.replace("wsite-", "")}-${String(sequence).padStart(3, "0")}`,
      websiteId: seed.id,
      status,
      trigger: rng.chance(0.28) ? "manual" : "scheduled",
      device,
      startedAt,
      durationMs: rng.int(18_000, 96_000),
      scores: adjusted,
      healthScore: health,
      vitals: vitalsFromScore(adjusted.performance, rng),
      issuesFound: 0, // filled in once issues are assigned
      passedChecks: Math.round(totalChecks * (health / 100) * rng.float(0.9, 1)),
      totalChecks,
      failureReason,
    });

    sequence += 1;
    daysAgo += rng.int(5, 9);
  }

  audits.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  // One site shows an in-flight run and one shows a queued run so every audit
  // status is represented somewhere in the dataset.
  if (siteIndex === 3 && audits.length > 0) {
    audits[0] = { ...audits[0], status: "running", durationMs: 0 };
  }
  if (siteIndex === 7 && audits.length > 0) {
    audits[0] = { ...audits[0], status: "queued", durationMs: 0 };
  }

  const completedAudits = audits.filter((a) => a.status === "completed");

  // ---------------------------------------------------------------- issues
  // Weight the catalogue towards the categories this site actually struggles
  // with, so a site with a poor accessibility score surfaces a11y findings.
  const weakness: Record<string, number> = {
    performance: 100 - seed.base.performance,
    seo: 100 - seed.base.seo,
    accessibility: 100 - seed.base.accessibility,
    "best-practices": 100 - seed.base.bestPractices,
    security: 26,
  };

  const scored = ISSUE_TEMPLATES.map((template) => ({
    template,
    weight: (weakness[template.category] ?? 20) + rng.float(0, 34),
  }))
    .sort((a, b) => b.weight - a.weight)
    .map((entry) => entry.template);

  const issueCount = clamp(
    Math.round((100 - healthScore(seed.base)) / 3.2) + rng.int(2, 5),
    3,
    14,
  );

  const issues: Issue[] = scored
    .slice(0, issueCount)
    .map((template, index) => buildIssue(template, index, seed, completedAudits, rng));

  for (const audit of audits) {
    audit.issuesFound = issues.filter((issue) => issue.auditId === audit.id).length;
  }

  // ---------------------------------------------------------------- website
  const latest = audits.find((a) => a.status === "completed") ?? audits[0];

  const website: Website = {
    id: seed.id,
    name: seed.name,
    url: seed.url,
    initials: seed.initials,
    environment: seed.environment,
    team: seed.team,
    tags: seed.tags,
    status: seed.status,
    scores: seed.base,
    healthScore: healthScore(seed.base),
    uptime30d: seed.uptime30d,
    avgResponseMs: seed.avgResponseMs,
    lastAuditAt: latest?.startedAt ?? REFERENCE_NOW.toISOString(),
    monitoringSince: new Date(
      REFERENCE_NOW.getTime() - (180 + siteIndex * 47) * DAY_MS,
    ).toISOString(),
  };

  return { website, audits, issues, trend, uptime };
}

function buildIssue(
  template: IssueTemplate,
  index: number,
  seed: SiteSeed,
  completedAudits: Audit[],
  rng: Rng,
): Issue {
  // Bias findings towards recent audits — most open work comes from the last
  // runs — while still leaving a tail of older findings that have been closed.
  const auditIndex = Math.min(
    completedAudits.length - 1,
    Math.floor(Math.abs(rng.float(-1, 1)) * Math.min(9, completedAudits.length)),
  );
  const audit = completedAudits[Math.max(0, auditIndex)];
  const foundAt = audit?.startedAt ?? REFERENCE_NOW.toISOString();

  const ageDays =
    (REFERENCE_NOW.getTime() - new Date(foundAt).getTime()) / DAY_MS;

  // Older findings are more likely to have been worked or closed out.
  let status: IssueStatus;
  const roll = rng.next();
  if (ageDays > 30) {
    status = roll < 0.5 ? "resolved" : roll < 0.7 ? "ignored" : "open";
  } else if (ageDays > 10) {
    status = roll < 0.28 ? "resolved" : roll < 0.6 ? "in_progress" : "open";
  } else {
    status = roll < 0.18 ? "in_progress" : "open";
  }

  const updatedAt =
    status === "open"
      ? foundAt
      : new Date(
          Math.min(
            REFERENCE_NOW.getTime(),
            new Date(foundAt).getTime() + rng.int(1, 9) * DAY_MS,
          ),
        ).toISOString();

  return {
    id: `issue-${seed.id.replace("wsite-", "")}-${String(index).padStart(3, "0")}`,
    websiteId: seed.id,
    auditId: audit?.id ?? "",
    title: template.title,
    description: template.description,
    recommendation: template.recommendation,
    severity: template.severity,
    category: template.category,
    status,
    foundAt,
    updatedAt,
    scoreImpact: template.scoreImpact,
    effort: template.effort,
    affectedPages: template.pages,
    ruleId: template.ruleId,
  };
}

/**
 * Builds the full demo dataset. Deterministic — the same seed always produces
 * the same websites, audits and findings.
 */
export function createSeedState(): SeedDataset {
  const built = SITE_SEEDS.map(buildSite);

  return {
    websites: built.map((b) => b.website),
    audits: built
      .flatMap((b) => b.audits)
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      ),
    issues: built.flatMap((b) => b.issues),
    trends: Object.fromEntries(built.map((b) => [b.website.id, b.trend])),
    uptime: Object.fromEntries(built.map((b) => [b.website.id, b.uptime])),
  };
}
