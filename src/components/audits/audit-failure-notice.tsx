import { RefreshCw, TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { Website } from "@/types";

/**
 * Surfaces a failed run without hiding the last good result.
 *
 * The scores on the page still come from the most recent *successful* audit.
 * Saying so explicitly matters: otherwise a user seeing yesterday's numbers
 * after a failure has no way to know they are stale.
 */
export function AuditFailureNotice({ website }: { website: Website }) {
  const failure = website.lastFailure;
  if (!failure) return null;

  return (
    <Card className="border-warning/40 bg-warning-soft/40">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-foreground">
            The most recent audit failed {formatRelative(failure.at)}
          </p>
          <p className="text-sm text-muted-foreground">{failure.reason}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-subtle-foreground">
            <span>Attempted {formatDateTime(failure.at)}</span>
            {failure.code ? (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono">{failure.code}</span>
              </>
            ) : null}
          </p>
          {website.lastAuditAt ? (
            <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <RefreshCw className="size-3" />
              Scores below are from the last successful run,{" "}
              {formatRelative(website.lastAuditAt)}.
            </p>
          ) : (
            <p className="pt-1 text-xs text-muted-foreground">
              This site has no successful audit yet, so no scores are shown.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
