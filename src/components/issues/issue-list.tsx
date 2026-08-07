"use client";

import { ChevronRight } from "lucide-react";
import { CategoryBadge, SeverityBadge } from "@/components/shared/badges";
import { formatRelative } from "@/lib/format";
import type { Issue, Website } from "@/types";

/**
 * Compact issue row. Clicking opens the shared detail drawer rather than
 * navigating, so context is never lost.
 */
export function IssueListRow({
  issue,
  website,
  onSelect,
  showWebsite = true,
}: {
  issue: Issue;
  website?: Website;
  onSelect: (issue: Issue) => void;
  showWebsite?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(issue)}
      className="group flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-hover"
    >
      <span className="mt-1 shrink-0">
        <SeverityBadge severity={issue.severity} size="sm" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {issue.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle-foreground">
          {showWebsite ? (
            <>
              <span className="truncate">{website?.name ?? "Unknown site"}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <CategoryBadge category={issue.category} size="sm" />
          <span aria-hidden>·</span>
          <span>Found {formatRelative(issue.foundAt)}</span>
          <span aria-hidden>·</span>
          <span className="text-muted-foreground">
            +{issue.scoreImpact} pts if fixed
          </span>
        </span>
      </span>

      <ChevronRight className="mt-1 size-4 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </button>
  );
}
