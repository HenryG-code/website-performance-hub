"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate } from "@/lib/format";
import type { UptimeDay } from "@/types";
import {
  AXIS_STROKE,
  GRID_STROKE,
  axisTick,
  barCursor,
  tooltipContentStyle,
  tooltipItemStyle,
  tooltipLabelStyle,
} from "./chart-theme";

function barColor(uptime: number): string {
  if (uptime >= 99.9) return "#34d399";
  if (uptime >= 99) return "#fbbf24";
  return "#f87171";
}

/** Daily availability bars, scaled to make sub-1% dips actually visible. */
export function UptimeChart({
  data,
  height = 132,
}: {
  data: UptimeDay[];
  height?: number;
}) {
  const worst = Math.min(...data.map((d) => d.uptime), 100);
  const floor = Math.min(97, Math.floor(worst * 2) / 2 - 0.5);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(value: string) => formatShortDate(value)}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
          minTickGap={40}
          stroke={AXIS_STROKE}
        />
        <YAxis
          domain={[floor, 100]}
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={46}
          tickFormatter={(value: number) => `${value}%`}
          stroke={AXIS_STROKE}
        />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={barCursor}
          labelFormatter={(value) => formatShortDate(String(value))}
          formatter={(value) => [`${value}%`, "Uptime"]}
        />
        <Bar dataKey="uptime" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {data.map((day) => (
            <Cell key={day.date} fill={barColor(day.uptime)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Non-interactive strip of daily status blocks, for compact contexts. */
export function UptimeStrip({ data }: { data: UptimeDay[] }) {
  return (
    <div className="flex items-end gap-[3px]" aria-hidden>
      {data.map((day) => (
        <span
          key={day.date}
          title={`${day.date}: ${day.uptime}%`}
          className="h-7 flex-1 rounded-[2px]"
          style={{
            background: barColor(day.uptime),
            opacity: day.uptime >= 99.9 ? 0.55 : 0.9,
          }}
        />
      ))}
    </div>
  );
}
