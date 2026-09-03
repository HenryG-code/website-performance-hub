"use client";

import Link from "next/link";
import { ChevronRight, Monitor, Smartphone } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScroller,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AuditStatusBadge, ScoreBadge } from "@/components/shared/badges";
import { SiteAvatar } from "@/components/shared/site-avatar";
import { formatDateTime, formatDuration, formatRelative } from "@/lib/format";
import { SCORE_LABELS } from "@/lib/scores";
import type { Audit, ScoreKey, Website } from "@/types";

const CATEGORY_KEYS: ScoreKey[] = [
  "performance",
  "seo",
  "accessibility",
  "bestPractices",
];

export function AuditTable({
  audits,
  websites,
}: {
  audits: Audit[];
  websites: Website[];
}) {
  return (
    <TableScroller>
      <Table className="min-w-[60rem]">
        <TableHeader>
          <TableRow>
            <TableHead>Website</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-44">Started</TableHead>
            <TableHead className="w-24">Health</TableHead>
            <TableHead className="w-56">Category scores</TableHead>
            <TableHead className="w-24">Duration</TableHead>
            <TableHead className="w-24">Issues</TableHead>
            <TableHead className="w-10" aria-label="Open" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {audits.map((audit) => {
            const website = websites.find((w) => w.id === audit.websiteId);
            const DeviceIcon = audit.device === "mobile" ? Smartphone : Monitor;
            const completed = audit.status === "completed";

            return (
              <TableRow key={audit.id}>
                <TableCell>
                  <Link
                    href={`/audits/${audit.id}`}
                    className="flex items-center gap-3"
                  >
                    <SiteAvatar
                      name={website?.name ?? "Unknown"}
                      initials={website?.initials ?? "??"}
                      size="sm"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {website?.name ?? "Unknown website"}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle-foreground">
                        <DeviceIcon className="size-3" />
                        {audit.device}
                        <span aria-hidden>·</span>
                        {audit.trigger}
                      </span>
                    </span>
                  </Link>
                </TableCell>

                <TableCell>
                  <AuditStatusBadge status={audit.status} size="sm" />
                </TableCell>

                <TableCell>
                  <span className="block text-xs text-muted-foreground">
                    {formatDateTime(audit.startedAt)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-subtle-foreground">
                    {formatRelative(audit.startedAt)}
                  </span>
                </TableCell>

                <TableCell>
                  {completed ? (
                    <ScoreBadge score={audit.healthScore} />
                  ) : (
                    <span className="text-xs text-subtle-foreground">—</span>
                  )}
                </TableCell>

                <TableCell>
                  {completed ? (
                    <div className="flex flex-wrap gap-1">
                      {CATEGORY_KEYS.map((key) => (
                        <Badge
                          key={key}
                          tone="outline"
                          size="sm"
                          title={SCORE_LABELS[key]}
                          className="font-mono tabular-nums"
                        >
                          <span className="font-sans text-subtle-foreground">
                            {SCORE_LABELS[key].slice(0, 1)}
                          </span>
                          {audit.scores[key]}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-subtle-foreground">—</span>
                  )}
                </TableCell>

                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {completed ? formatDuration(audit.durationMs) : "—"}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {completed ? audit.issuesFound : "—"}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <Link
                    href={`/audits/${audit.id}`}
                    aria-label="Open audit detail"
                    className="inline-flex rounded p-1 text-subtle-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableScroller>
  );
}

/** Phone-first audit cards avoid forcing a wide, low-signal table onto a small screen. */
export function AuditCards({
  audits,
  websites,
}: {
  audits: Audit[];
  websites: Website[];
}) {
  return (
    <div className="space-y-3">
      {audits.map((audit) => {
        const website = websites.find((w) => w.id === audit.websiteId);
        const DeviceIcon = audit.device === "mobile" ? Smartphone : Monitor;
        const completed = audit.status === "completed";

        return (
          <Link
            key={audit.id}
            href={`/audits/${audit.id}`}
            className="block rounded-card border border-border bg-card p-4 transition-colors active:bg-elevated/50"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 items-center gap-3">
                <SiteAvatar
                  name={website?.name ?? "Unknown"}
                  initials={website?.initials ?? "??"}
                  size="sm"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {website?.name ?? "Unknown website"}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle-foreground">
                    <DeviceIcon className="size-3" />
                    {audit.device} · {formatRelative(audit.startedAt)}
                  </span>
                </span>
              </span>
              <AuditStatusBadge status={audit.status} size="sm" />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 text-xs">
              <span>
                <span className="block text-subtle-foreground">Health</span>
                <span className="mt-1 block">
                  {completed ? <ScoreBadge score={audit.healthScore} /> : "—"}
                </span>
              </span>
              <span>
                <span className="block text-subtle-foreground">Duration</span>
                <span className="mt-1 block font-mono text-foreground tabular-nums">
                  {completed ? formatDuration(audit.durationMs) : "—"}
                </span>
              </span>
              <span>
                <span className="block text-subtle-foreground">Findings</span>
                <span className="mt-1 block font-mono text-foreground tabular-nums">
                  {completed ? audit.issuesFound : "—"}
                </span>
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
