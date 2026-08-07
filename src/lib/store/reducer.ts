import { REFERENCE_NOW } from "@/lib/constants";
import { healthScore } from "@/lib/scores";
import { ISSUE_TEMPLATES } from "@/lib/mock/catalog";
import { createRng, clamp } from "@/lib/mock/random";
import { vitalsFromScore } from "@/lib/mock/generate";
import type {
  Audit,
  Issue,
  IssueStatus,
  PersistedState,
  ScoreKey,
  Scores,
  SettingsPatch,
  TrendPoint,
  Website,
} from "@/types";

const SCORE_KEYS: ScoreKey[] = [
  "performance",
  "seo",
  "accessibility",
  "bestPractices",
];

export interface NewWebsiteInput {
  name: string;
  url: string;
  team: string;
  environment: Website["environment"];
  tags: string[];
}

export type Action =
  /** `state` is null when nothing usable was found in storage. */
  | { type: "hydrate"; state: PersistedState | null }
  | { type: "reset"; state: PersistedState }
  | { type: "website/add"; input: NewWebsiteInput; id: string; at: string }
  | { type: "website/remove"; id: string }
  | { type: "audit/start"; websiteId: string; auditId: string; at: string }
  | { type: "audit/complete"; auditId: string; seed: number }
  | { type: "issue/status"; id: string; status: IssueStatus; at: string }
  | { type: "settings/update"; patch: SettingsPatch };

export function reducer(state: PersistedState, action: Action): PersistedState {
  switch (action.type) {
    case "hydrate":
      return action.state ?? state;

    case "reset":
      return action.state;

    case "website/add":
      return addWebsite(state, action);

    case "website/remove":
      return {
        ...state,
        websites: state.websites.filter((w) => w.id !== action.id),
        audits: state.audits.filter((a) => a.websiteId !== action.id),
        issues: state.issues.filter((i) => i.websiteId !== action.id),
        trends: omit(state.trends, action.id),
        uptime: omit(state.uptime, action.id),
      };

    case "audit/start":
      return startAudit(state, action);

    case "audit/complete":
      return completeAudit(state, action);

    case "issue/status":
      return {
        ...state,
        issues: state.issues.map((issue) =>
          issue.id === action.id
            ? { ...issue, status: action.status, updatedAt: action.at }
            : issue,
        ),
      };

    case "settings/update":
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.patch,
          profile: { ...state.settings.profile, ...action.patch.profile },
          notifications: {
            ...state.settings.notifications,
            ...action.patch.notifications,
          },
        },
      };

    default:
      return state;
  }
}

function omit<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

/**
 * A newly added website has no history yet. We create the record with empty
 * trend/uptime series so the detail page renders genuine empty states until the
 * first audit runs, rather than inventing a past that never happened.
 */
function addWebsite(
  state: PersistedState,
  action: Extract<Action, { type: "website/add" }>,
): PersistedState {
  const { input, id, at } = action;

  const website: Website = {
    id,
    name: input.name,
    url: normaliseUrl(input.url),
    initials: initialsOf(input.name),
    environment: input.environment,
    team: input.team || "Unassigned",
    tags: input.tags,
    status: "paused",
    scores: { performance: 0, seo: 0, accessibility: 0, bestPractices: 0 },
    healthScore: 0,
    uptime30d: 100,
    avgResponseMs: 0,
    lastAuditAt: "",
    monitoringSince: at,
  };

  return {
    ...state,
    websites: [website, ...state.websites],
    trends: { ...state.trends, [id]: [] },
    uptime: { ...state.uptime, [id]: [] },
  };
}

function startAudit(
  state: PersistedState,
  action: Extract<Action, { type: "audit/start" }>,
): PersistedState {
  const website = state.websites.find((w) => w.id === action.websiteId);
  if (!website) return state;

  const audit: Audit = {
    id: action.auditId,
    websiteId: website.id,
    status: "running",
    trigger: "manual",
    device: "desktop",
    startedAt: action.at,
    durationMs: 0,
    scores: website.scores,
    healthScore: website.healthScore,
    vitals: {
      lcp: 0,
      cls: 0,
      inp: 0,
      ttfb: 0,
      fcp: 0,
      tbt: 0,
      speedIndex: 0,
    },
    issuesFound: 0,
    passedChecks: 0,
    totalChecks: 0,
  };

  return { ...state, audits: [audit, ...state.audits] };
}

/**
 * Resolves an in-flight audit: scores move by a small delta, the trend series
 * gains (or replaces) today's point, and a finding may be opened or cleared.
 */
function completeAudit(
  state: PersistedState,
  action: Extract<Action, { type: "audit/complete" }>,
): PersistedState {
  const audit = state.audits.find((a) => a.id === action.auditId);
  if (!audit || audit.status !== "running") return state;

  const website = state.websites.find((w) => w.id === audit.websiteId);
  if (!website) return state;

  const rng = createRng(action.seed);
  const isFirstAudit = !website.lastAuditAt;

  const scores = {} as Scores;
  for (const key of SCORE_KEYS) {
    if (isFirstAudit) {
      // No baseline yet — produce a plausible first reading.
      scores[key] = Math.round(clamp(rng.float(58, 96), 20, 100));
    } else {
      scores[key] = Math.round(
        clamp(website.scores[key] + rng.float(-4, 6), 20, 100),
      );
    }
  }

  const health = healthScore(scores);
  const totalChecks = rng.int(84, 112);
  const completedAt = new Date();

  // Open a new finding when a category regresses, close one when it improves.
  const { issues, newIssueCount } = reconcileIssues(
    state.issues,
    website,
    scores,
    audit.id,
    completedAt.toISOString(),
    rng,
  );

  const completed: Audit = {
    ...audit,
    status: "completed",
    durationMs: rng.int(21_000, 58_000),
    scores,
    healthScore: health,
    vitals: vitalsFromScore(scores.performance, rng),
    issuesFound: newIssueCount,
    passedChecks: Math.round(totalChecks * (health / 100) * rng.float(0.9, 1)),
    totalChecks,
  };

  const updatedWebsite: Website = {
    ...website,
    scores,
    healthScore: health,
    status: website.status === "paused" ? "operational" : website.status,
    lastAuditAt: audit.startedAt,
    avgResponseMs:
      website.avgResponseMs ||
      Math.round(180 + (100 - scores.performance) * 7 + rng.float(0, 90)),
  };

  return {
    ...state,
    websites: state.websites.map((w) =>
      w.id === website.id ? updatedWebsite : w,
    ),
    audits: state.audits.map((a) => (a.id === audit.id ? completed : a)),
    issues,
    trends: {
      ...state.trends,
      [website.id]: appendTrendPoint(state.trends[website.id] ?? [], scores),
    },
  };
}

function appendTrendPoint(trend: TrendPoint[], scores: Scores): TrendPoint[] {
  const today = new Date().toISOString().slice(0, 10);
  const point: TrendPoint = {
    date: today,
    ...scores,
    health: healthScore(scores),
  };

  const last = trend[trend.length - 1];
  // Multiple runs on the same day update that day's point instead of stacking.
  if (last && last.date >= today) {
    return [...trend.slice(0, -1), { ...point, date: last.date }];
  }
  return [...trend, point];
}

function reconcileIssues(
  issues: Issue[],
  website: Website,
  nextScores: Scores,
  auditId: string,
  at: string,
  rng: ReturnType<typeof createRng>,
): { issues: Issue[]; newIssueCount: number } {
  const activeRuleIds = new Set(
    issues
      .filter(
        (i) =>
          i.websiteId === website.id &&
          (i.status === "open" || i.status === "in_progress"),
      )
      .map((i) => i.ruleId),
  );

  // Categories that lost ground in this run are candidates for a new finding.
  const regressed = SCORE_KEYS.filter(
    (key) => nextScores[key] < website.scores[key],
  ).map(categoryOf);

  const candidates = ISSUE_TEMPLATES.filter(
    (t) => !activeRuleIds.has(t.ruleId) && regressed.includes(t.category),
  );

  const next = [...issues];
  let newIssueCount = 0;

  if (candidates.length > 0 && rng.chance(0.75)) {
    const template = rng.pick(candidates);
    next.unshift({
      id: `issue-run-${auditId}-${template.ruleId}`,
      websiteId: website.id,
      auditId,
      title: template.title,
      description: template.description,
      recommendation: template.recommendation,
      severity: template.severity,
      category: template.category,
      status: "open",
      foundAt: at,
      updatedAt: at,
      scoreImpact: template.scoreImpact,
      effort: template.effort,
      affectedPages: template.pages,
      ruleId: template.ruleId,
    });
    newIssueCount += 1;
  }

  return { issues: next, newIssueCount };
}

function categoryOf(key: ScoreKey): Issue["category"] {
  return key === "bestPractices" ? "best-practices" : key;
}

export function normaliseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/** Exported for tests/debugging: the clock the seed data was generated against. */
export const SEED_CLOCK = REFERENCE_NOW;
