"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  FileCode2,
  Lightbulb,
  Target,
  Wrench,
} from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CategoryBadge,
  IssueStatusBadge,
  SeverityBadge,
} from "@/components/shared/badges";
import { useToast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store/app-store";
import { ISSUE_STATUSES, STATUS_LABELS } from "@/lib/scores";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { Issue, IssueStatus } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Detail drawer for a single finding. Status changes are written straight to
 * the local store, so they persist across reloads and update every list that
 * shows the issue.
 */
export function IssueDetailSheet({
  issue,
  onOpenChange,
}: {
  issue: Issue | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, setIssueStatus } = useAppStore();
  const { toast } = useToast();

  const website = issue
    ? state.websites.find((w) => w.id === issue.websiteId)
    : undefined;
  const audit = issue
    ? state.audits.find((a) => a.id === issue.auditId)
    : undefined;

  async function changeStatus(next: IssueStatus) {
    if (!issue || issue.status === next) return;

    const result = await setIssueStatus(issue.id, next);

    toast(
      result.ok
        ? {
            tone: next === "resolved" ? "success" : "info",
            title: `Marked as ${STATUS_LABELS[next]}`,
            description: issue.title,
          }
        : {
            tone: "warning",
            title: "Couldn't update that issue",
            description: result.error,
          },
    );
  }

  return (
    <Sheet open={issue !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-xl">
        {issue ? (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={issue.severity} />
                <CategoryBadge category={issue.category} />
                <IssueStatusBadge status={issue.status} />
              </div>
              <SheetTitle className="pt-1">{issue.title}</SheetTitle>
              <SheetDescription>
                {website ? (
                  <Link
                    href={`/websites/${website.id}`}
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    {website.name}
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                ) : (
                  "Unknown website"
                )}
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="space-y-6">
              <Section icon={Target} title="What we found">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {issue.description}
                </p>
              </Section>

              <Section icon={Lightbulb} title="Recommended fix">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {issue.recommendation}
                </p>
              </Section>

              <Section icon={FileCode2} title="Affected pages">
                <ul className="flex flex-wrap gap-1.5">
                  {issue.affectedPages.map((page) => (
                    <li key={page}>
                      <Badge tone="outline" className="font-mono text-[11px]">
                        {page}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section icon={CalendarClock} title="Details">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <Detail label="Rule">
                    <span className="font-mono text-xs text-foreground">
                      {issue.ruleId}
                    </span>
                  </Detail>
                  <Detail label="Score impact">
                    <span className="text-success">+{issue.scoreImpact} pts</span>
                  </Detail>
                  <Detail label="Estimated effort">
                    <span className="capitalize">{issue.effort}</span>
                  </Detail>
                  <Detail label="Detected by">
                    {audit ? (
                      <Link
                        href={`/audits/${audit.id}`}
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                      >
                        Audit run
                        <ArrowUpRight className="size-3" />
                      </Link>
                    ) : (
                      <span className="text-subtle-foreground">—</span>
                    )}
                  </Detail>
                  <Detail label="First seen">{formatDateTime(issue.foundAt)}</Detail>
                  <Detail label="Last updated">
                    {formatRelative(issue.updatedAt)}
                  </Detail>
                </dl>
              </Section>
            </SheetBody>

            <SheetFooter className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wrench className="size-3.5" />
                Update status
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ISSUE_STATUSES.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={issue.status === status ? "primary" : "outline"}
                    onClick={() => changeStatus(status)}
                    aria-pressed={issue.status === status}
                    className={cn(
                      "justify-center",
                      issue.status === status && "pointer-events-none",
                    )}
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-subtle-foreground uppercase">
        <Icon className="size-3.5" />
        {title}
      </h4>
      {children}
    </section>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] text-subtle-foreground">{label}</dt>
      <dd className="text-xs text-muted-foreground">{children}</dd>
    </div>
  );
}
