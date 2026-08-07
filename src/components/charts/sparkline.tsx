"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { TrendPoint } from "@/types";

/**
 * Axis-free mini chart for table rows and score cards. Deliberately has no
 * tooltip — it communicates shape, not values.
 */
export function Sparkline({
  data,
  dataKey = "health",
  color = "#38bdf8",
  height = 36,
  gradientId,
}: {
  data: TrendPoint[];
  dataKey?: keyof TrendPoint;
  color?: string;
  height?: number;
  gradientId: string;
}) {
  if (data.length < 2) {
    return (
      <div
        className="flex items-center text-[11px] text-subtle-foreground"
        style={{ height }}
      >
        Not enough history
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin - 6", "dataMax + 6"]} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
