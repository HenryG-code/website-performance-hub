"use client";

import Link from "next/link";
import { BellRing, ChevronDown, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/store/app-store";
import { signOut } from "@/app/actions/auth";
import { initialsFrom } from "@/lib/format";

export function UserMenu() {
  const { state } = useAppStore();
  const { profile } = state.settings;

  const displayName = profile.name || profile.email || "Your account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border bg-surface py-1 pr-2 pl-1 transition-colors hover:border-border-strong"
          aria-label="Account menu"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent font-mono text-[11px] font-semibold text-white">
            {initialsFrom(displayName)}
          </span>
          <span className="hidden max-w-28 truncate text-xs font-medium text-foreground sm:block">
            {displayName}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-subtle-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium text-foreground">
            {displayName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          {profile.role || profile.company ? (
            <p className="mt-1 truncate text-[11px] text-subtle-foreground">
              {[profile.role, profile.company].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <User />
            Profile settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings#notifications">
            <BellRing />
            Notification preferences
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <form action={signOut}>
          <button
            type="submit"
            className="relative flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-danger outline-none select-none hover:bg-danger/12 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-danger"
          >
            <LogOut />
            Sign out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
