import type { IssueStatus } from "@/types";
import type { MappedFinding } from "@/lib/pagespeed/map";

/**
 * Decides what happens to stored findings when a new audit reports its results.
 *
 * Pure and separate from the database call because this is where data loss
 * hides. The previous implementation deleted every finding for a website and
 * re-inserted, which silently destroyed the status a user had set on each one
 * and stripped findings from earlier audits' detail pages.
 */

export interface ExistingFinding {
  id: string;
  ruleId: string;
  status: IssueStatus;
}

export interface ReconciliationPlan {
  /** Still failing: refresh the measurements, carrying `status` forward. */
  update: { id: string; finding: MappedFinding; status: IssueStatus }[];
  /** Reported for the first time. */
  insert: MappedFinding[];
  /** No longer reported, so it passes now. */
  resolve: string[];
}

export function planFindingReconciliation(
  existing: ExistingFinding[],
  reported: MappedFinding[],
): ReconciliationPlan {
  const existingByRule = new Map(existing.map((row) => [row.ruleId, row]));
  const reportedRules = new Set(reported.map((finding) => finding.ruleId));

  const update: ReconciliationPlan["update"] = [];
  const insert: MappedFinding[] = [];

  for (const finding of reported) {
    const row = existingByRule.get(finding.ruleId);
    if (!row) {
      insert.push(finding);
      continue;
    }

    update.push({
      id: row.id,
      finding,
      // A finding the user had closed but which is failing again must reopen.
      // Anything else keeps whatever status they chose: re-running an audit
      // should never quietly undo someone's triage.
      status: row.status === "resolved" ? "open" : row.status,
    });
  }

  const resolve = existing
    .filter(
      (row) => !reportedRules.has(row.ruleId) && row.status !== "resolved",
    )
    .map((row) => row.id);

  return { update, insert, resolve };
}
