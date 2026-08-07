import { ISSUE_TEMPLATES, type IssueTemplate } from "@/lib/mock/catalog";
import { clamp, createRng } from "@/lib/mock/random";
import { vitalsFromScore } from "@/lib/mock/generate";
import { healthScore } from "@/lib/scores";
import type { Issue, ScoreKey, Scores, WebVitals } from "@/types";

const SCORE_KEYS: ScoreKey[] = [
  "performance",
  "seo",
  "accessibility",
  "bestPractices",
];

export interface SimulatedAudit {
  scores: Scores;
  health: number;
  vitals: WebVitals;
  durationMs: number;
  passedChecks: number;
  totalChecks: number;
  /** Templates for findings this run opened. */
  newFindings: IssueTemplate[];
}

/**
 * Produces a plausible audit result.
 *
 * Still a simulation — no page is actually fetched — but it now runs on the
 * server and its output is written to Postgres, so results survive reloads and
 * are shared across a user's devices. Swapping this for a real Lighthouse run
 * means replacing this one function.
 */
export function simulateAudit({
  previousScores,
  activeRuleIds,
  seed,
}: {
  /** Null for a website's very first run. */
  previousScores: Scores | null;
  /** Rules already open for this website, so findings are not duplicated. */
  activeRuleIds: string[];
  seed: number;
}): SimulatedAudit {
  const rng = createRng(seed);

  const scores = {} as Scores;
  for (const key of SCORE_KEYS) {
    scores[key] = previousScores
      ? // Small drift, biased slightly upward: most runs follow remediation work.
        Math.round(clamp(previousScores[key] + rng.float(-4, 6), 20, 100))
      : Math.round(clamp(rng.float(58, 96), 20, 100));
  }

  const health = healthScore(scores);
  const totalChecks = rng.int(84, 112);

  // Categories that lost ground are the candidates for a new finding.
  const regressed = previousScores
    ? SCORE_KEYS.filter((key) => scores[key] < previousScores[key]).map(
        categoryFor,
      )
    : SCORE_KEYS.filter((key) => scores[key] < 80).map(categoryFor);

  const open = new Set(activeRuleIds);
  const candidates = ISSUE_TEMPLATES.filter(
    (template) => !open.has(template.ruleId) && regressed.includes(template.category),
  );

  const newFindings: IssueTemplate[] = [];
  if (candidates.length > 0 && rng.chance(0.75)) {
    newFindings.push(rng.pick(candidates));
  }
  // A first run on a poor-scoring site tends to surface more than one thing.
  if (!previousScores && candidates.length > 1 && rng.chance(0.6)) {
    const second = rng.pick(
      candidates.filter((c) => c.ruleId !== newFindings[0]?.ruleId),
    );
    if (second) newFindings.push(second);
  }

  return {
    scores,
    health,
    vitals: vitalsFromScore(scores.performance, rng),
    durationMs: rng.int(21_000, 58_000),
    totalChecks,
    passedChecks: Math.round(totalChecks * (health / 100) * rng.float(0.9, 1)),
    newFindings,
  };
}

function categoryFor(key: ScoreKey): Issue["category"] {
  return key === "bestPractices" ? "best-practices" : key;
}

/** How long the UI shows an audit as running before it resolves. */
export const AUDIT_SIMULATION_MS = 2600;
