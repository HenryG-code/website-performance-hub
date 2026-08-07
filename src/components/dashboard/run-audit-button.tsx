"use client";

import * as React from "react";
import { Loader2, Play } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store/app-store";

/**
 * Kicks off a simulated audit. The store creates a `running` audit immediately,
 * then resolves it a couple of seconds later with new scores, a fresh trend
 * point and possibly a new finding — so the whole UI updates from one click.
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

  const running = websiteIds.some(isAuditing);
  const disabled = running || websiteIds.length === 0;

  const resolvedLabel =
    label ??
    (websiteIds.length === 1
      ? "Run audit"
      : `Run audit on ${websiteIds.length} sites`);

  function handleClick() {
    const started = websiteIds.filter((id) => runAudit(id) !== null);
    if (started.length === 0) return;

    const name =
      started.length === 1
        ? (state.websites.find((w) => w.id === started[0])?.name ?? "website")
        : `${started.length} websites`;

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
      {running ? <Loader2 className="animate-spin" /> : <Play />}
      {running ? "Running audit…" : resolvedLabel}
    </Button>
  );
}
