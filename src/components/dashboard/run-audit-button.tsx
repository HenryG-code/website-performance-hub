"use client";

import * as React from "react";
import { Loader2, Play } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store/app-store";

/**
 * Kicks off a simulated audit.
 *
 * The run is written to Supabase as `running` straight away, then resolved a
 * couple of seconds later with scores, lab metrics and any new findings — so
 * the result survives a reload and shows up on every device.
 */
export function RunAuditButton({
  websiteIds,
  label,
  variant = "primary",
  size = "md",
  className,
}: {
  /** One id runs a single site; several run them together. */
  websiteIds: string[];
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const { runAudit, isAuditing, state } = useAppStore();
  const { toast } = useToast();
  const [starting, setStarting] = React.useState(false);

  const running = websiteIds.some(isAuditing);
  const disabled = running || starting || websiteIds.length === 0;

  const resolvedLabel =
    label ??
    (websiteIds.length === 1
      ? "Run audit"
      : `Run audit on ${websiteIds.length} sites`);

  async function handleClick() {
    setStarting(true);
    const results = await Promise.all(websiteIds.map((id) => runAudit(id)));
    setStarting(false);

    const started = results.filter((result) => result.ok).length;

    if (started === 0) {
      const failure = results.find((result) => !result.ok);
      toast({
        tone: "warning",
        title: "Couldn't start the audit",
        description: failure && !failure.ok ? failure.error : undefined,
      });
      return;
    }

    const name =
      started === 1
        ? (state.websites.find((w) => w.id === websiteIds[0])?.name ?? "website")
        : `${started} websites`;

    toast({
      tone: "info",
      title: `Audit started for ${name}`,
      description: "Collecting Lighthouse metrics — results appear in a moment.",
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled}
      className={className}
      aria-live="polite"
    >
      {running || starting ? <Loader2 className="animate-spin" /> : <Play />}
      {running || starting ? "Running audit…" : resolvedLabel}
    </Button>
  );
}
