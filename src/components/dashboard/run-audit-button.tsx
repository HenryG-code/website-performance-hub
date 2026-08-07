"use client";

import * as React from "react";
import { ChevronDown, Loader2, Monitor, Play, Smartphone } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store/app-store";
import type { Device } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Runs real PageSpeed Insights audits.
 *
 * A live run takes 10-60s per site, so the control stays disabled and explicit
 * about what it is doing for the whole round-trip. The strategy picker maps
 * directly onto PageSpeed's `mobile` and `desktop` strategies.
 */
export function RunAuditButton({
  websiteIds,
  label,
  variant = "primary",
  size = "md",
  className,
}: {
  websiteIds: string[];
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const { runAudit, isAuditing, state } = useAppStore();
  const { toast } = useToast();

  const [strategy, setStrategy] = React.useState<Device>(
    state.settings.defaultDevice,
  );
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);

  const running = websiteIds.some(isAuditing) || busy;
  const disabled = running || websiteIds.length === 0;

  const resolvedLabel =
    label ??
    (websiteIds.length === 1
      ? "Run audit"
      : `Run audit on ${websiteIds.length} sites`);

  async function run(chosen: Device) {
    setBusy(true);
    setStrategy(chosen);

    try {
      // Sequential rather than parallel: PageSpeed rate-limits per key, and a
      // burst of concurrent requests is the quickest way to get throttled.
      let succeeded = 0;
      const failures: string[] = [];

      for (const [index, id] of websiteIds.entries()) {
        if (websiteIds.length > 1) {
          setProgress(`${index + 1} of ${websiteIds.length}`);
        }
        const result = await runAudit(id, chosen);
        if (result.ok) succeeded += 1;
        else failures.push(result.error);
      }

      if (succeeded > 0) {
        toast({
          tone: "success",
          title:
            succeeded === 1
              ? `Audit complete (${chosen})`
              : `${succeeded} audits complete (${chosen})`,
          description:
            failures.length > 0
              ? `${failures.length} failed. See the audit history for details.`
              : "Scores, metrics and findings come from Google PageSpeed Insights.",
        });
      } else {
        toast({
          tone: "warning",
          title: "Audit failed",
          description: failures[0] ?? "The audit could not be run.",
        });
      }
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (!state.auditsConfigured) {
    return (
      <Button variant="outline" size={size} disabled className={className}>
        <Play />
        Audits not configured
      </Button>
    );
  }

  const StrategyIcon = strategy === "mobile" ? Smartphone : Monitor;

  return (
    <div className={cn("flex", className)}>
      <Button
        variant={variant}
        size={size}
        onClick={() => void run(strategy)}
        disabled={disabled}
        aria-live="polite"
        className="rounded-r-none"
      >
        {running ? <Loader2 className="animate-spin" /> : <Play />}
        {running
          ? progress
            ? `Auditing ${progress}…`
            : "Running audit…"
          : resolvedLabel}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled}
            aria-label="Choose audit strategy"
            className="rounded-l-none border-l border-black/25 px-2"
          >
            <StrategyIcon />
            <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>PageSpeed strategy</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void run("mobile")}>
            <Smartphone />
            Mobile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void run("desktop")}>
            <Monitor />
            Desktop
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
