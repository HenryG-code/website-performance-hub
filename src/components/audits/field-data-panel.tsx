import { FlaskConical, Info, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { formatMs } from "@/lib/format";
import type { CruxCategory, FieldVitals, WebVitals } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Lab and field Core Web Vitals, side by side and explicitly labelled.
 *
 * These are different measurements and conflating them is the single most
 * common way performance dashboards mislead: lab data is one synthetic run on
 * Google's hardware, field data is 28 days of real Chrome users. When Google
 * reports no field data, this says so rather than leaving the column blank and
 * letting the lab number stand in for it.
 */

const CRUX_TONE: Record<CruxCategory, string> = {
  FAST: "text-success",
  AVERAGE: "text-warning",
  SLOW: "text-danger",
  NONE: "text-subtle-foreground",
};

const CRUX_LABEL: Record<CruxCategory, string> = {
  FAST: "Good",
  AVERAGE: "Needs improvement",
  SLOW: "Poor",
  NONE: "Not enough data",
};

interface Row {
  key: string;
  label: string;
  description: string;
  core: boolean;
  lab: string;
  field: string;
  fieldCategory: CruxCategory | null;
}

export function FieldDataPanel({
  lab,
  labTtfbMs,
  field,
  className,
}: {
  lab: WebVitals;
  /** Kept separate because 0ms is a real measurement, not a missing one. */
  labTtfbMs?: number | null;
  field: FieldVitals | null;
  className?: string;
}) {
  const seconds = (value: number) =>
    value > 0 ? `${value.toFixed(1)}s` : "—";

  const rows: Row[] = [
    {
      key: "lcp",
      label: "LCP",
      description:
        "Largest Contentful Paint — when the main content finishes rendering.",
      core: true,
      lab: seconds(lab.lcp),
      field: formatMs(field?.lcpMs ?? null),
      fieldCategory: field?.overallCategory ? (field.categories?.lcp ?? null) : null,
    },
    {
      key: "inp",
      label: "INP",
      description:
        "Interaction to Next Paint. Field-only: Lighthouse cannot measure real interactions.",
      core: true,
      lab: "Not measured",
      field: formatMs(field?.inpMs ?? null),
      fieldCategory: field?.categories?.inp ?? null,
    },
    {
      key: "cls",
      label: "CLS",
      description:
        "Cumulative Layout Shift — how much the page moves while loading.",
      core: true,
      lab: lab.cls > 0 ? lab.cls.toFixed(3) : "—",
      field: field?.cls != null ? field.cls.toFixed(3) : "—",
      fieldCategory: field?.categories?.cls ?? null,
    },
    {
      key: "fcp",
      label: "FCP",
      description: "First Contentful Paint — when the first text or image appears.",
      core: false,
      lab: seconds(lab.fcp),
      field: formatMs(field?.fcpMs ?? null),
      fieldCategory: field?.categories?.fcp ?? null,
    },
    {
      key: "ttfb",
      label: "TTFB",
      description: "Time to First Byte — server response latency.",
      core: false,
      lab:
        labTtfbMs !== null && labTtfbMs !== undefined
          ? formatMs(labTtfbMs)
          : "—",
      field: formatMs(field?.ttfbMs ?? null),
      fieldCategory: field?.categories?.ttfb ?? null,
    },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">
          <FlaskConical className="size-3" />
          Lab · one synthetic run
        </Badge>
        {field ? (
          <Badge tone={field.overallCategory === "FAST" ? "success" : "warning"}>
            <Users className="size-3" />
            Field · real users, 28 days ({field.scope})
          </Badge>
        ) : (
          <Badge tone="neutral">
            <Users className="size-3" />
            No field data
          </Badge>
        )}
      </div>

      {!field ? (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0 text-subtle-foreground" />
          Google reports real-user data only for sites with enough Chrome
          traffic. This site has none yet, so only lab measurements are shown.
        </p>
      ) : null}

      <div className="table-scroll">
        <table className="w-full min-w-[26rem] text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 text-left text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                Metric
              </th>
              <th className="pb-2 text-right text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                Lab
              </th>
              <th className="pb-2 text-right text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                Field
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="py-2.5">
                  <Tooltip content={row.description}>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-foreground">{row.label}</span>
                      {row.core ? (
                        <span className="rounded bg-elevated px-1 text-[9px] tracking-wide text-subtle-foreground uppercase">
                          Core
                        </span>
                      ) : null}
                    </span>
                  </Tooltip>
                </td>
                <td className="py-2.5 text-right font-mono text-muted-foreground tabular-nums">
                  {row.lab}
                </td>
                <td
                  className={cn(
                    "py-2.5 text-right font-mono tabular-nums",
                    row.fieldCategory
                      ? CRUX_TONE[row.fieldCategory]
                      : "text-subtle-foreground",
                  )}
                  title={
                    row.fieldCategory ? CRUX_LABEL[row.fieldCategory] : undefined
                  }
                >
                  {row.field}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
