"use client";

import Link from "next/link";
import { ChevronRight, Clock, Monitor, Smartphone } from "lucide-react";
import { AuditStatusBadge, ScoreBadge } from "@/components/shared/badges";
import { SiteAvatar } from "@/components/shared/site-avatar";
import { formatDuration, formatRelative } from "@/lib/format";
import type { Audit, Website } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Compact audit row used by the dashboard and website detail pages. The full
 * table on /audits is a separate component with sortable columns.
 */
export function AuditListRow({
  audit,
  website,
  showWebsite = true,
}: {
  audit: Audit;
  website?: Website;
  showWebsite?: boolean;
}) {
  const DeviceIcon = audit.device === "mobile" ? Smartphone : Monitor;

  return (
    <Link
      href={`/audits/${audit.id}`}
      className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-hover"
    >
      {showWebsite && website ? (
        <SiteAvatar name={website.name} initials={website.initials} size="sm" />
      ) : (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-elevated">
          <DeviceIcon className="size-3.5 text-subtle-foreground" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {showWebsite ? (website?.name ?? "Unknown website") : audit.id}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-subtle-foreground">
          <span>{formatRelative(audit.startedAt)}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <DeviceIcon className="size-3" />
            {audit.device}
          </span>
          {audit.status === "completed" ? (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {formatDuration(audit.durationMs)}
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {audit.status === "completed" ? (
          <ScoreBadge score={audit.healthScore} size="sm" />
        ) : (
          <AuditStatusBadge status={audit.status} size="sm" />
        )}
        <ChevronRight
          className={cn(
            "size-4 text-subtle-foreground transition-transform",
            "group-hover:translate-x-0.5 group-hover:text-muted-foreground",
          )}
        />
      </div>
    </Link>
  );
}
