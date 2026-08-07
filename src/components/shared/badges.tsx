import {
  Activity,
  CheckCircle2,
  CircleDashed,
  CirclePause,
  CircleSlash,
  Clock,
  Loader2,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BAND_LABELS,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  scoreBand,
} from "@/lib/scores";
import type {
  AuditStatus,
  IssueCategory,
  IssueStatus,
  Severity,
  WebsiteStatus,
} from "@/types";

type Tone = NonNullable<BadgeProps["tone"]>;

const SEVERITY_TONE: Record<Severity, Tone> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

export function SeverityBadge({
  severity,
  size = "md",
}: {
  severity: Severity;
  size?: BadgeProps["size"];
}) {
  return (
    <Badge tone={SEVERITY_TONE[severity]} size={size}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          severity === "critical" && "bg-danger",
          severity === "high" && "bg-warning",
          severity === "medium" && "bg-info",
          severity === "low" && "bg-subtle-foreground",
        )}
      />
      {SEVERITY_LABELS[severity]}
    </Badge>
  );
}

const ISSUE_STATUS_TONE: Record<IssueStatus, Tone> = {
  open: "danger",
  in_progress: "primary",
  resolved: "success",
  ignored: "neutral",
};

const ISSUE_STATUS_ICON: Record<IssueStatus, React.ElementType> = {
  open: CircleDashed,
  in_progress: Activity,
  resolved: CheckCircle2,
  ignored: CircleSlash,
};

export function IssueStatusBadge({
  status,
  size = "md",
}: {
  status: IssueStatus;
  size?: BadgeProps["size"];
}) {
  const Icon = ISSUE_STATUS_ICON[status];
  return (
    <Badge tone={ISSUE_STATUS_TONE[status]} size={size}>
      <Icon className="size-3" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const AUDIT_STATUS_TONE: Record<AuditStatus, Tone> = {
  completed: "success",
  running: "primary",
  queued: "neutral",
  failed: "danger",
};

const AUDIT_STATUS_LABEL: Record<AuditStatus, string> = {
  completed: "Completed",
  running: "Running",
  queued: "Queued",
  failed: "Failed",
};

export function AuditStatusBadge({
  status,
  size = "md",
}: {
  status: AuditStatus;
  size?: BadgeProps["size"];
}) {
  const Icon =
    status === "completed"
      ? CheckCircle2
      : status === "running"
        ? Loader2
        : status === "queued"
          ? Clock
          : XCircle;

  return (
    <Badge tone={AUDIT_STATUS_TONE[status]} size={size}>
      <Icon className={cn("size-3", status === "running" && "animate-spin")} />
      {AUDIT_STATUS_LABEL[status]}
    </Badge>
  );
}

const SITE_STATUS_TONE: Record<WebsiteStatus, Tone> = {
  operational: "success",
  degraded: "warning",
  down: "danger",
  paused: "neutral",
};

const SITE_STATUS_LABEL: Record<WebsiteStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
  paused: "Not audited",
};

export function WebsiteStatusBadge({
  status,
  size = "md",
}: {
  status: WebsiteStatus;
  size?: BadgeProps["size"];
}) {
  const Icon =
    status === "operational"
      ? CheckCircle2
      : status === "degraded"
        ? TriangleAlert
        : status === "down"
          ? XCircle
          : CirclePause;

  return (
    <Badge tone={SITE_STATUS_TONE[status]} size={size}>
      <Icon className="size-3" />
      {SITE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function CategoryBadge({
  category,
  size = "md",
}: {
  category: IssueCategory;
  size?: BadgeProps["size"];
}) {
  return (
    <Badge tone="outline" size={size}>
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}

/** Compact numeric score chip coloured by good/fair/poor banding. */
export function ScoreBadge({
  score,
  size = "md",
  showLabel = false,
}: {
  score: number;
  size?: BadgeProps["size"];
  showLabel?: boolean;
}) {
  const band = scoreBand(score);
  const tone: Tone =
    band === "good" ? "success" : band === "fair" ? "warning" : "danger";

  return (
    <Badge tone={tone} size={size} className="font-mono tabular-nums">
      {score}
      {showLabel ? (
        <span className="font-sans font-normal opacity-80">{BAND_LABELS[band]}</span>
      ) : null}
    </Badge>
  );
}
