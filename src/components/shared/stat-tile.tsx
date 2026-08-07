import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Compact KPI tile: label, large value, optional icon and a footer slot for a
 * delta or supporting sentence. Used across the dashboard and detail pages so
 * every metric reads the same way.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  iconClassName,
  footer,
  valueClassName,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  footer?: React.ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <Icon className={cn("size-4 text-subtle-foreground", iconClassName)} />
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground",
          valueClassName,
        )}
      >
        {value}
      </p>
      {footer ? <div className="mt-2 text-xs">{footer}</div> : null}
    </Card>
  );
}
