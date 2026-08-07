"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

/** Sentinel used because Radix Select reserves the empty string. */
export const ALL = "__all__";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-subtle-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allLabel: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("w-full sm:w-44", className)} aria-label={label}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Filter toolbar shell. Renders its controls in a responsive row and shows a
 * "Clear" affordance plus a result count when any filter is active.
 */
export function FilterBar({
  children,
  active,
  onClear,
  resultLabel,
  className,
}: {
  children: React.ReactNode;
  active: boolean;
  onClear: () => void;
  resultLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-card border border-border bg-card p-3",
        "sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {children}
      <div className="flex items-center gap-3 sm:ml-auto">
        {resultLabel ? (
          <span className="text-xs text-subtle-foreground tabular-nums">
            {resultLabel}
          </span>
        ) : null}
        {active ? (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X />
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
