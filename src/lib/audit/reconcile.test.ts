import { describe, expect, it } from "vitest";
import { planFindingReconciliation, type ExistingFinding } from "./reconcile";
import type { MappedFinding } from "@/lib/pagespeed/map";

function finding(ruleId: string, overrides: Partial<MappedFinding> = {}) {
  return {
    ruleId,
    title: `Title for ${ruleId}`,
    description: "",
    displayValue: null,
    category: "performance",
    severity: "medium",
    kind: "diagnostic",
    savingsMs: null,
    scoreImpact: 5,
    affectedResources: [],
    ...overrides,
  } as MappedFinding;
}

function existing(
  id: string,
  ruleId: string,
  status: ExistingFinding["status"] = "open",
): ExistingFinding {
  return { id, ruleId, status };
}

describe("planFindingReconciliation", () => {
  it("inserts findings reported for the first time", () => {
    const plan = planFindingReconciliation([], [finding("color-contrast")]);

    expect(plan.insert.map((f) => f.ruleId)).toEqual(["color-contrast"]);
    expect(plan.update).toEqual([]);
    expect(plan.resolve).toEqual([]);
  });

  it("updates a finding that is still reported, without reinserting it", () => {
    const plan = planFindingReconciliation(
      [existing("issue-1", "color-contrast")],
      [finding("color-contrast")],
    );

    expect(plan.insert).toEqual([]);
    expect(plan.update).toHaveLength(1);
    expect(plan.update[0].id).toBe("issue-1");
  });

  // The bug this whole module exists to prevent: a re-run used to wipe every
  // finding and reinsert, silently discarding the user's triage.
  it.each(["in_progress", "ignored"] as const)(
    "carries a %s status forward across a re-run",
    (status) => {
      const plan = planFindingReconciliation(
        [existing("issue-1", "color-contrast", status)],
        [finding("color-contrast")],
      );

      expect(plan.update[0].status).toBe(status);
    },
  );

  it("reopens a resolved finding that is failing again", () => {
    const plan = planFindingReconciliation(
      [existing("issue-1", "color-contrast", "resolved")],
      [finding("color-contrast")],
    );

    expect(plan.update[0].status).toBe("open");
  });

  it("resolves a finding the new run no longer reports", () => {
    const plan = planFindingReconciliation(
      [existing("issue-1", "color-contrast"), existing("issue-2", "image-alt")],
      [finding("color-contrast")],
    );

    expect(plan.resolve).toEqual(["issue-2"]);
  });

  it("leaves an already-resolved finding alone", () => {
    const plan = planFindingReconciliation(
      [existing("issue-1", "image-alt", "resolved")],
      [],
    );

    // No pointless write, and no status churn.
    expect(plan.resolve).toEqual([]);
    expect(plan.update).toEqual([]);
  });

  it("resolves an ignored finding once it stops being reported", () => {
    const plan = planFindingReconciliation(
      [existing("issue-1", "image-alt", "ignored")],
      [],
    );

    expect(plan.resolve).toEqual(["issue-1"]);
  });

  it("never deletes anything", () => {
    const plan = planFindingReconciliation(
      [existing("issue-1", "gone-rule")],
      [finding("new-rule")],
    );

    // The plan has no delete channel at all: history is preserved by design.
    expect(Object.keys(plan).sort()).toEqual(["insert", "resolve", "update"]);
    expect(plan.resolve).toEqual(["issue-1"]);
  });

  it("handles a clean run that reports nothing", () => {
    const plan = planFindingReconciliation(
      [existing("issue-1", "a"), existing("issue-2", "b")],
      [],
    );

    expect(plan.insert).toEqual([]);
    expect(plan.update).toEqual([]);
    expect(plan.resolve.sort()).toEqual(["issue-1", "issue-2"]);
  });

  it("handles a mixed run", () => {
    const plan = planFindingReconciliation(
      [
        existing("keep", "still-failing", "in_progress"),
        existing("gone", "now-passing"),
        existing("back", "regressed", "resolved"),
      ],
      [finding("still-failing"), finding("regressed"), finding("brand-new")],
    );

    expect(plan.insert.map((f) => f.ruleId)).toEqual(["brand-new"]);
    expect(plan.resolve).toEqual(["gone"]);
    expect(
      plan.update.map((u) => [u.id, u.status]).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    ).toEqual([
      ["back", "open"],
      ["keep", "in_progress"],
    ]);
  });
});
