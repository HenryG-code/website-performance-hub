"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * `lg` matches the 44px primary button, which is the right rhythm for a
   * focused form like sign-in. The default stays compact for the dense filter
   * bars and table controls, where 44px would waste vertical space.
   */
  inputSize?: "default" | "lg";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = "default", ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      inputSize === "lg" ? "h-11" : "h-9.5",
      "w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground",
      "placeholder:text-subtle-foreground",
      "transition-colors focus:border-primary/60 focus:bg-elevated",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "aria-[invalid=true]:border-danger/70",
      className,
    )}
    {...props}
  />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-20 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground",
      "placeholder:text-subtle-foreground",
      "transition-colors focus:border-primary/60 focus:bg-elevated",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
