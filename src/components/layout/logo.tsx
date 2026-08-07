import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
        <Activity className="size-4.5 text-white" strokeWidth={2.5} />
      </span>
      {showWordmark ? (
        <span className="flex flex-col">
          <span className="text-sm leading-5 font-semibold tracking-tight text-foreground">
            PerformanceHub
          </span>
          {/*
            Uppercase at 10px needs its own line box and wider tracking to stay
            readable; `leading-none` on the parent squashed it to a 10px line.
          */}
          <span className="text-[10px] leading-[1.4] tracking-[0.14em] text-subtle-foreground uppercase">
            Website health
          </span>
        </span>
      ) : null}
    </span>
  );
}
