"use client";

import Link from "next/link";
import { BarChart3, ShieldCheck } from "lucide-react";
import { Card, CardToolbar } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { AuditListRow } from "@/components/audits/audit-list";
import { IssueListRow } from "@/components/issues/issue-list";
import type { Audit, Issue, Website } from "@/types";

function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-xs text-accent transition-colors hover:underline"
    >
      {label}
    </Link>
  );
}

export function RecentAuditsCard({
  audits,
  websites,
  showWebsite = true,
  href = "/audits",
}: {
  audits: Audit[];
  websites: Website[];
  showWebsite?: boolean;
  href?: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardToolbar
        title="Recent audits"
        description="Latest runs, newest first"
        action={<ViewAllLink href={href} label="View all" />}
      />
      {audits.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No audits yet"
          description="Run an audit to capture a first set of scores for this selection."
        />
      ) : (
        <ul className="divide-y divide-border">
          {audits.map((audit) => (
            <li key={audit.id}>
              <AuditListRow
                audit={audit}
                website={websites.find((w) => w.id === audit.websiteId)}
                showWebsite={showWebsite}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function PriorityIssuesCard({
  issues,
  websites,
  onSelect,
  showWebsite = true,
  href = "/issues",
}: {
  issues: Issue[];
  websites: Website[];
  onSelect: (issue: Issue) => void;
  showWebsite?: boolean;
  href?: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardToolbar
        title="Priority issues"
        description="Highest severity findings still open"
        action={<ViewAllLink href={href} label="View all" />}
      />
      {issues.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No open findings"
          description="Everything in this selection is resolved or ignored. Run a new audit to check again."
        />
      ) : (
        <ul className="divide-y divide-border">
          {issues.map((issue) => (
            <li key={issue.id}>
              <IssueListRow
                issue={issue}
                website={websites.find((w) => w.id === issue.websiteId)}
                onSelect={onSelect}
                showWebsite={showWebsite}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
