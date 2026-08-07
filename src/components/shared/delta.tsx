import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Signed change indicator. `invert` flips the colour semantics for metrics
 * where lower is better (response time, issue counts).
 */
export function Delta({
  value,
  suffix = "",
  invert = false,
  className,
  showZero = true,
}: {
  value: number;
  suffix?: string;
  invert?: boolean;
  className?: string;
  showZero?: boolean;
}) {
  const rounded = Math.round(value * 10) / 10;

  if (rounded === 0) {
    if (!showZero) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs text-subtle-foreground",
          className,
        )}
      >
        <Minus className="size-3" />
        No change
      </span>
    );
  }

  const positive = rounded > 0;
  const good = invert ? !positive : positive;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
        good ? "text-success" : "text-danger",
        className,
      )}
    >
      <Icon className="size-3.5" />
      {positive ? "+" : ""}
      {rounded}
      {suffix}
    </span>
  );
}
