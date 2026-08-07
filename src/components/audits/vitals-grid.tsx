import { Tooltip } from "@/components/ui/tooltip";
import { BAND_HEX } from "@/lib/scores";
import type { ScoreBand, WebVitals } from "@/types";
import { cn } from "@/lib/utils";

interface VitalSpec {
  key: keyof WebVitals;
  label: string;
  unit: string;
  /** Upper bound for "good", then for "needs improvement". */
  thresholds: [number, number];
  decimals: number;
  description: string;
  core?: boolean;
}

/** Thresholds follow the published Core Web Vitals and Lighthouse guidance. */
const VITALS: VitalSpec[] = [
  {
    key: "lcp",
    label: "LCP",
    unit: "s",
    thresholds: [2.5, 4],
    decimals: 1,
    description: "Largest Contentful Paint — when the main content finishes rendering.",
    core: true,
  },
  {
    key: "inp",
    label: "INP",
    unit: "ms",
    thresholds: [200, 500],
    decimals: 0,
    description: "Interaction to Next Paint — responsiveness to user input.",
    core: true,
  },
  {
    key: "cls",
    label: "CLS",
    unit: "",
    thresholds: [0.1, 0.25],
    decimals: 3,
    description: "Cumulative Layout Shift — how much the page moves while loading.",
    core: true,
  },
  {
    key: "fcp",
    label: "FCP",
    unit: "s",
    thresholds: [1.8, 3],
    decimals: 1,
    description: "First Contentful Paint — when the first text or image appears.",
  },
  {
    key: "ttfb",
    label: "TTFB",
    unit: "ms",
    thresholds: [800, 1800],
    decimals: 0,
    description: "Time to First Byte — server response latency.",
  },
  {
    key: "tbt",
    label: "TBT",
    unit: "ms",
    thresholds: [200, 600],
    decimals: 0,
    description: "Total Blocking Time — main-thread work blocking interaction.",
  },
  {
    key: "speedIndex",
    label: "Speed Index",
    unit: "s",
    thresholds: [3.4, 5.8],
    decimals: 1,
    description: "How quickly content is visually displayed during load.",
  },
];

function bandFor(value: number, [good, fair]: [number, number]): ScoreBand {
  if (value <= good) return "good";
  if (value <= fair) return "fair";
  return "poor";
}

/** Lab metrics grid shown on audit detail and the website performance tab. */
export function VitalsGrid({
  vitals,
  className,
}: {
  vitals: WebVitals;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {VITALS.map((spec) => {
        const value = vitals[spec.key];
        const band = bandFor(value, spec.thresholds);

        return (
          <Tooltip key={spec.key} content={spec.description}>
            <div className="rounded-lg border border-border bg-surface p-3 text-left">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {spec.label}
                {spec.core ? (
                  <span className="rounded bg-elevated px-1 text-[9px] tracking-wide text-subtle-foreground uppercase">
                    Core
                  </span>
                ) : null}
              </dt>
              <dd
                className="mt-1 font-mono text-lg font-semibold tabular-nums"
                style={{ color: BAND_HEX[band] }}
              >
                {value.toFixed(spec.decimals)}
                <span className="ml-0.5 text-xs font-normal">{spec.unit}</span>
              </dd>
            </div>
          </Tooltip>
        );
      })}
    </dl>
  );
}
