"use client";

import { ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableScroller,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CategoryBadge,
  SeverityBadge,
} from "@/components/shared/badges";
import { SiteAvatar } from "@/components/shared/site-avatar";
import { formatDate, formatRelative } from "@/lib/format";
import { ISSUE_STATUSES, STATUS_LABELS } from "@/lib/scores";
import type { Issue, IssueStatus, Website } from "@/types";

export function IssueTable({
  issues,
  websites,
  onSelect,
  onStatusChange,
}: {
  issues: Issue[];
  websites: Website[];
  onSelect: (issue: Issue) => void;
  onStatusChange: (issue: Issue, status: IssueStatus) => void;
}) {
  return (
    <TableScroller>
      <Table className="min-w-[60rem]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Severity</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead className="w-36">Category</TableHead>
            <TableHead className="w-44">Website</TableHead>
            <TableHead className="w-40">Status</TableHead>
            <TableHead className="w-32">Found</TableHead>
            <TableHead className="w-10" aria-label="Open" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue) => {
            const website = websites.find((w) => w.id === issue.websiteId);

            return (
              <TableRow key={issue.id}>
                <TableCell>
                  <SeverityBadge severity={issue.severity} size="sm" />
                </TableCell>

                <TableCell>
                  <button
                    type="button"
                    onClick={() => onSelect(issue)}
                    className="block max-w-md text-left"
                  >
                    <span className="block truncate text-sm font-medium text-foreground hover:text-accent">
                      {issue.title}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] text-subtle-foreground">
                      {issue.ruleId} · +{issue.scoreImpact} pts · {issue.effort}{" "}
                      effort
                    </span>
                  </button>
                </TableCell>

                <TableCell>
                  <CategoryBadge category={issue.category} size="sm" />
                </TableCell>

                <TableCell>
                  <span className="flex items-center gap-2">
                    <SiteAvatar
                      name={website?.name ?? "Unknown"}
                      initials={website?.initials ?? "??"}
                      size="sm"
                    />
                    <span className="truncate text-xs text-muted-foreground">
                      {website?.name ?? "Unknown website"}
                    </span>
                  </span>
                </TableCell>

                <TableCell>
                  <Select
                    value={issue.status}
                    onValueChange={(value) =>
                      onStatusChange(issue, value as IssueStatus)
                    }
                  >
                    <SelectTrigger
                      className="h-8 w-36 text-xs"
                      aria-label={`Status for ${issue.title}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell>
                  <span className="block text-xs text-muted-foreground">
                    {formatDate(issue.foundAt)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-subtle-foreground">
                    {formatRelative(issue.foundAt)}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(issue)}
                    aria-label={`Open details for ${issue.title}`}
                    className="inline-flex rounded p-1 text-subtle-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableScroller>
  );
}
