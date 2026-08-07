import { BAND_HEX, BAND_LABELS, scoreBand } from "@/lib/scores";
import { cn } from "@/lib/utils";

/**
 * Circular score gauge. Pure SVG rather than a chart library — it renders on the
 * server, costs nothing, and keeps the health colour banding consistent with
 * the rest of the UI.
 */
export function ScoreRing({
  score,
  size = 132,
  strokeWidth = 10,
  label,
  className,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}) {
  const band = scoreBand(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = BAND_HEX[band];

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? "Score"}: ${score} out of 100, ${BAND_LABELS[band]}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono text-3xl font-semibold tabular-nums"
          style={{ color }}
        >
          {score}
        </span>
        <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">
          {BAND_LABELS[band]}
        </span>
      </div>
    </div>
  );
}
