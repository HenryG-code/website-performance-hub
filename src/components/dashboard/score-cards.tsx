"use client";

import { Accessibility, Gauge, Search, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Delta } from "@/components/shared/delta";
import { Sparkline } from "@/components/charts/sparkline";
import { BAND_HEX, SCORE_LABELS, SERIES_HEX, scoreBand } from "@/lib/scores";
import type { CategoryBreakdown } from "@/lib/store/selectors";
import type { ScoreKey, TrendPoint } from "@/types";
import { cn } from "@/lib/utils";

const ICONS: Record<ScoreKey, LucideIcon> = {
  performance: Gauge,
  seo: Search,
  accessibility: Accessibility,
  bestPractices: ShieldCheck,
};

/**
 * The four Lighthouse category cards. Each shows the current score, its 30-day
 * change, a sparkline of recent history and how many findings are still open.
 */
export function ScoreCards({
  breakdown,
  trend,
  idPrefix = "dash",
}: {
  breakdown: CategoryBreakdown[];
  trend: TrendPoint[];
  /** Namespaces the SVG gradient ids so multiple instances can coexist. */
  idPrefix?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {breakdown.map((item) => {
        const Icon = ICONS[item.key];
        const band = scoreBand(item.score);

        return (
          <Card key={item.key} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="flex size-7 items-center justify-center rounded-lg"
                  style={{ background: `${SERIES_HEX[item.key]}1f` }}
                >
                  <Icon
                    className="size-3.5"
                    style={{ color: SERIES_HEX[item.key] }}
                  />
                </span>
                <p className="text-xs font-medium text-muted-foreground">
                  {SCORE_LABELS[item.key]}
                </p>
              </div>
              <Delta value={item.delta} showZero={false} />
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <p
                className="font-mono text-3xl leading-none font-semibold tabular-nums"
                style={{ color: BAND_HEX[band] }}
              >
                {item.score}
                <span className="ml-1 font-sans text-xs font-normal text-subtle-foreground">
                  /100
                </span>
              </p>
              <div className="h-9 w-24">
                <Sparkline
                  data={trend}
                  dataKey={item.key}
                  color={SERIES_HEX[item.key]}
                  gradientId={`${idPrefix}-${item.key}`}
                />
              </div>
            </div>

            <Progress
              value={item.score}
              className="mt-3"
              label={`${SCORE_LABELS[item.key]} score`}
              indicatorClassName={cn(
                band === "good" && "bg-success",
                band === "fair" && "bg-warning",
                band === "poor" && "bg-danger",
              )}
            />

            <p className="mt-2 text-[11px] text-subtle-foreground">
              {item.openIssues === 0
                ? "No open findings"
                : `${item.openIssues} open finding${item.openIssues === 1 ? "" : "s"}`}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
