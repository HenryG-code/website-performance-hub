"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardToolbar } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { Delta } from "@/components/shared/delta";
import { IssueListRow } from "@/components/issues/issue-list";
import { VitalsGrid } from "@/components/audits/vitals-grid";
import { PASSED_CHECKS } from "@/lib/mock/catalog";
import { BAND_HEX, CATEGORY_LABELS, scoreBand, sortBySeverity } from "@/lib/scores";
import type { Audit, Issue, IssueCategory } from "@/types";
import { cn } from "@/lib/utils";

/**
 * One category tab on the website detail page: the score, its recent movement,
 * the open findings behind it, and the checks that passed.
 */
export function CategoryFindings({
  category,
  score,
  delta,
  issues,
  latestAudit,
  onSelectIssue,
}: {
  category: IssueCategory;
  score: number;
  delta: number;
  issues: Issue[];
  /** Supplies lab metrics for the performance tab. */
  latestAudit?: Audit;
  onSelectIssue: (issue: Issue) => void;
}) {
  const band = scoreBand(score);
  const open = issues.filter((i) => i.status === "open" || i.status === "in_progress");
  const resolved = issues.filter((i) => i.status === "resolved");
  const sorted = [...open].sort(sortBySeverity);
  const potentialGain = sorted.reduce((sum, issue) => sum + issue.scoreImpact, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="sm:w-56">
            <p className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[category]} score
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className="font-mono text-4xl font-semibold tabular-nums"
                style={{ color: BAND_HEX[band] }}
              >
                {score}
              </span>
              <Delta value={delta} suffix=" pts" showZero={false} />
            </div>
            <Progress
              value={score}
              className="mt-3"
              label={`${CATEGORY_LABELS[category]} score`}
              indicatorClassName={cn(
                band === "good" && "bg-success",
                band === "fair" && "bg-warning",
                band === "poor" && "bg-danger",
              )}
            />
          </div>

          <dl className="grid flex-1 grid-cols-3 gap-4 border-border sm:border-l sm:pl-6">
            <div>
              <dt className="text-xs text-subtle-foreground">Open findings</dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-foreground tabular-nums">
                {open.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-subtle-foreground">Resolved</dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-success tabular-nums">
                {resolved.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-subtle-foreground">Potential gain</dt>
              <dd className="mt-1 font-mono text-xl font-semibold text-accent tabular-nums">
                +{potentialGain}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {category === "performance" && latestAudit ? (
        <Card>
          <CardToolbar
            title="Lab metrics"
            description="From the most recent completed audit"
          />
          <CardContent>
            <VitalsGrid vitals={latestAudit.vitals} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardToolbar
          title="Open findings"
          description={`${CATEGORY_LABELS[category]} issues that still need attention`}
        />
        {sorted.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No open findings in this category"
            description="Every check in this category either passed or has already been dealt with."
          />
        ) : (
          <ul className="divide-y divide-border">
            {sorted.map((issue) => (
              <li key={issue.id}>
                <IssueListRow
                  issue={issue}
                  onSelect={onSelectIssue}
                  showWebsite={false}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardToolbar
          title="Passed checks"
          description="Verified as healthy in the latest run"
        />
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {PASSED_CHECKS[category].map((check) => (
              <li
                key={check}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <CheckCircle2 className="mt-px size-3.5 shrink-0 text-success" />
                {check}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
