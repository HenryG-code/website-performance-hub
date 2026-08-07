"use client";

import Link from "next/link";
import { ArrowUpRight, Bug, ChevronRight } from "lucide-react";
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
import { ScoreBadge, WebsiteStatusBadge } from "@/components/shared/badges";
import { SiteAvatar } from "@/components/shared/site-avatar";
import { Sparkline } from "@/components/charts/sparkline";
import { displayUrl, formatMs, formatRelative } from "@/lib/format";
import type { TrendPoint, Website } from "@/types";
import { cn } from "@/lib/utils";

export interface WebsiteRow {
  website: Website;
  issueCount: number;
  trend: TrendPoint[];
}

export function WebsiteTable({ rows }: { rows: WebsiteRow[] }) {
  return (
    <TableScroller>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Website</TableHead>
            <TableHead className="w-32">Health</TableHead>
            <TableHead className="w-28">Score trend</TableHead>
            <TableHead className="w-28">Server response</TableHead>
            <TableHead className="w-24">Findings</TableHead>
            <TableHead className="w-32">Last audit</TableHead>
            <TableHead className="w-36">Status</TableHead>
            <TableHead className="w-10" aria-label="Open" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ website, issueCount, trend }) => (
            <TableRow key={website.id} className="group">
              <TableCell>
                <Link
                  href={`/websites/${website.id}`}
                  className="flex items-center gap-3"
                >
                  <SiteAvatar name={website.name} initials={website.initials} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {website.name}
                      </span>
                      {website.environment === "staging" ? (
                        <Badge tone="outline" size="sm">
                          Staging
                        </Badge>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-subtle-foreground">
                      {displayUrl(website.url)} · {website.team}
                    </span>
                  </span>
                </Link>
              </TableCell>

              <TableCell>
                {website.lastAuditAt ? (
                  <ScoreBadge score={website.healthScore} />
                ) : (
                  <span className="text-xs text-subtle-foreground">Not audited</span>
                )}
              </TableCell>

              <TableCell>
                <div className="h-9 w-24">
                  <Sparkline
                    data={trend.slice(-30)}
                    gradientId={`row-${website.id}`}
                  />
                </div>
              </TableCell>

              <TableCell>
                {website.ttfbMs === null ? (
                  <span className="text-xs text-subtle-foreground">Not measured</span>
                ) : (
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums",
                      website.ttfbMs <= 800
                        ? "text-success"
                        : website.ttfbMs <= 1800
                          ? "text-warning"
                          : "text-danger",
                    )}
                  >
                    {formatMs(website.ttfbMs)}
                  </span>
                )}
              </TableCell>

              <TableCell>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm tabular-nums",
                    issueCount === 0 ? "text-subtle-foreground" : "text-foreground",
                  )}
                >
                  <Bug className="size-3.5 text-subtle-foreground" />
                  {issueCount}
                </span>
              </TableCell>

              <TableCell>
                <span className="text-xs text-muted-foreground">
                  {website.lastAuditAt ? formatRelative(website.lastAuditAt) : "—"}
                </span>
              </TableCell>

              <TableCell>
                <WebsiteStatusBadge status={website.status} size="sm" />
              </TableCell>

              <TableCell className="text-right">
                <Link
                  href={`/websites/${website.id}`}
                  aria-label={`Open ${website.name}`}
                  className="inline-flex rounded p-1 text-subtle-foreground transition-colors hover:text-foreground"
                >
                  <ChevronRight className="size-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScroller>
  );
}

/** Card presentation of the same data, used by the grid view and on mobile. */
export function WebsiteCards({ rows }: { rows: WebsiteRow[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(({ website, issueCount, trend }) => (
        <Link
          key={website.id}
          href={`/websites/${website.id}`}
          className="group rounded-card border border-border bg-card p-4 transition-colors hover:border-border-strong hover:bg-elevated/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <SiteAvatar name={website.name} initials={website.initials} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {website.name}
                </p>
                <p className="truncate text-xs text-subtle-foreground">
                  {displayUrl(website.url)}
                </p>
              </div>
            </div>
            <ArrowUpRight className="size-4 shrink-0 text-subtle-foreground transition-transform group-hover:-translate-y-0.5 group-hover:text-foreground" />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            {website.lastAuditAt ? (
              <ScoreBadge score={website.healthScore} showLabel />
            ) : (
              <Badge tone="outline">Not audited</Badge>
            )}
            <WebsiteStatusBadge status={website.status} size="sm" />
          </div>

          <div className="mt-3 h-10">
            <Sparkline
              data={trend.slice(-30)}
              height={40}
              gradientId={`card-${website.id}`}
            />
          </div>

          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
            <div>
              <dt className="text-subtle-foreground">Response</dt>
              <dd className="mt-0.5 font-mono text-foreground tabular-nums">
                {formatMs(website.ttfbMs)}
              </dd>
            </div>
            <div>
              <dt className="text-subtle-foreground">Findings</dt>
              <dd className="mt-0.5 font-mono text-foreground tabular-nums">
                {issueCount}
              </dd>
            </div>
            <div>
              <dt className="text-subtle-foreground">Last audit</dt>
              <dd className="mt-0.5 text-muted-foreground">
                {website.lastAuditAt ? formatRelative(website.lastAuditAt) : "—"}
              </dd>
            </div>
          </dl>
        </Link>
      ))}
    </div>
  );
}
