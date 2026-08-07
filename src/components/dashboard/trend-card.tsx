"use client";

import * as React from "react";
import { LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendChart, TrendLegend } from "@/components/charts/trend-chart";
import { lastDays } from "@/lib/store/selectors";
import type { TrendPoint } from "@/types";

const RANGES = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
] as const;

/**
 * Score history panel with range and series controls. Both are local UI state —
 * the underlying series is always the full history from the store.
 */
export function TrendCard({
  trend,
  title = "Score trend",
  description = "Daily scores across the selected websites",
  height = 268,
}: {
  trend: TrendPoint[];
  title?: string;
  description?: string;
  height?: number;
}) {
  const [range, setRange] = React.useState<string>("30");
  const [mode, setMode] = React.useState<"health" | "categories">("health");

  const data = React.useMemo(
    () => lastDays(trend, Number(range)),
    [trend, range],
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
              <TabsList>
                <TabsTrigger value="health">Health</TabsTrigger>
                <TabsTrigger value="categories">Categories</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={range} onValueChange={setRange}>
              <TabsList>
                {RANGES.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        <TrendLegend mode={mode} />
      </CardHeader>

      <CardContent className="flex-1 pt-4 pl-2">
        {data.length < 2 ? (
          <EmptyState
            icon={LineChart}
            title="Not enough history yet"
            description="Score trends appear once a website has been audited on at least two days."
          />
        ) : (
          <TrendChart data={data} mode={mode} height={height} />
        )}
      </CardContent>
    </Card>
  );
}
