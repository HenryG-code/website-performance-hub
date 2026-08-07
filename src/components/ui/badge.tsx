import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-border bg-elevated text-muted-foreground",
        primary: "border-primary/30 bg-primary/12 text-accent",
        success: "border-success/30 bg-success/12 text-success",
        warning: "border-warning/30 bg-warning/12 text-warning",
        danger: "border-danger/30 bg-danger/12 text-danger",
        info: "border-info/30 bg-info/12 text-info",
        outline: "border-border-strong bg-transparent text-muted-foreground",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[11px] leading-4",
        md: "px-2 py-0.5 text-xs leading-5",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
  );
}

export { badgeVariants };
