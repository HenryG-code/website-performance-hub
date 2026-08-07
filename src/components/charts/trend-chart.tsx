"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate } from "@/lib/format";
import { SCORE_LABELS, SERIES_HEX } from "@/lib/scores";
import type { ScoreKey, TrendPoint } from "@/types";
import {
  AXIS_STROKE,
  GRID_STROKE,
  axisTick,
  tooltipContentStyle,
  tooltipCursor,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "./chart-theme";

const SERIES_NAMES: Record<ScoreKey | "health", string> = {
  health: "Health",
  ...SCORE_LABELS,
};

/**
 * Score history chart. In "health" mode it draws a single filled area; in
 * "categories" mode it overlays the four Lighthouse categories as lines.
 */
export function TrendChart({
  data,
  mode = "health",
  height = 260,
}: {
  data: TrendPoint[];
  mode?: "health" | "categories";
  height?: number;
}) {
  const domainMin = Math.max(
    0,
    Math.min(
      ...data.flatMap((point) =>
        mode === "health"
          ? [point.health]
          : [
              point.performance,
              point.seo,
              point.accessibility,
              point.bestPractices,
            ],
      ),
    ) - 12,
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES_HEX.health} stopOpacity={0.32} />
            <stop offset="100%" stopColor={SERIES_HEX.health} stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value: string) => formatShortDate(value)}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
          minTickGap={28}
          stroke={AXIS_STROKE}
        />
        <YAxis
          domain={[Math.floor(domainMin / 10) * 10, 100]}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={44}
          stroke={AXIS_STROKE}
        />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={tooltipCursor}
          labelFormatter={(value) => formatShortDate(String(value))}
          formatter={(value, name) => [
            `${value}`,
            SERIES_NAMES[name as ScoreKey | "health"] ?? String(name),
          ]}
        />

        {mode === "health" ? (
          <Area
            type="monotone"
            dataKey="health"
            stroke={SERIES_HEX.health}
            strokeWidth={2}
            fill="url(#healthFill)"
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        ) : (
          (
            [
              "performance",
              "seo",
              "accessibility",
              "bestPractices",
            ] as ScoreKey[]
          ).map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={SERIES_HEX[key]}
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 3.5, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Legend rendered outside the chart so it can sit in the card header. */
export function TrendLegend({ mode }: { mode: "health" | "categories" }) {
  const keys: (ScoreKey | "health")[] =
    mode === "health"
      ? ["health"]
      : ["performance", "seo", "accessibility", "bestPractices"];

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {keys.map((key) => (
        <li key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2 rounded-full"
            style={{ background: SERIES_HEX[key] }}
            aria-hidden
          />
          {SERIES_NAMES[key]}
        </li>
      ))}
    </ul>
  );
}
