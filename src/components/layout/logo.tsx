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
        <span className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            PerformanceHub
          </span>
          <span className="mt-0.5 text-[10px] tracking-wide text-subtle-foreground uppercase">
            Website health
          </span>
        </span>
      ) : null}
    </span>
  );
}
