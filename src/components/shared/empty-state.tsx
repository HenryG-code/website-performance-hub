import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared empty state. Every list, table and chart in the app routes through
 * this so "nothing here yet" always looks intentional and explains what to do.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full border border-border bg-elevated",
          compact ? "size-9" : "size-12",
        )}
      >
        <Icon
          className={cn("text-subtle-foreground", compact ? "size-4" : "size-5")}
        />
      </div>
      <div className="space-y-1">
        <p
          className={cn(
            "font-medium text-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {title}
        </p>
        {description ? (
          <p className="mx-auto max-w-sm text-xs text-muted-foreground text-balance">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
