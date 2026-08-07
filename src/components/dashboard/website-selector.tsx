"use client";

import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Website } from "@/types";

export const ALL_WEBSITES = "__all__";

/**
 * Scope control for the dashboard. Selecting a single site narrows every card,
 * chart and list on the page to that website.
 */
export function WebsiteSelector({
  websites,
  value,
  onChange,
  className,
}: {
  websites: Website[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const production = websites.filter((w) => w.environment === "production");
  const staging = websites.filter((w) => w.environment === "staging");

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={className ?? "w-full sm:w-60"}
        aria-label="Filter dashboard by website"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Globe className="size-4 shrink-0 text-subtle-foreground" />
          <SelectValue />
        </span>
      </SelectTrigger>

      <SelectContent>
        <SelectItem value={ALL_WEBSITES}>All websites</SelectItem>

        {production.length > 0 ? (
          <SelectGroup>
            <SelectSeparator />
            <SelectLabel>Production</SelectLabel>
            {production.map((website) => (
              <SelectItem key={website.id} value={website.id}>
                {website.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}

        {staging.length > 0 ? (
          <SelectGroup>
            <SelectSeparator />
            <SelectLabel>Staging</SelectLabel>
            {staging.map((website) => (
              <SelectItem key={website.id} value={website.id}>
                {website.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
      </SelectContent>
    </Select>
  );
}
