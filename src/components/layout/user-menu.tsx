"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, ChevronDown, LogOut, RotateCcw, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store/app-store";
import { initialsFrom } from "@/lib/format";

export function UserMenu() {
  const { state, resetData } = useAppStore();
  const { toast } = useToast();
  const router = useRouter();
  const { profile } = state.settings;

  function handleReset() {
    resetData();
    router.push("/");
    toast({
      tone: "success",
      title: "Demo data restored",
      description: "Websites, audits and issues are back to their seeded state.",
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border bg-surface py-1 pr-2 pl-1 transition-colors hover:border-border-strong"
          aria-label="Account menu"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent font-mono text-[11px] font-semibold text-white">
            {initialsFrom(profile.name)}
          </span>
          <span className="hidden max-w-28 truncate text-xs font-medium text-foreground sm:block">
            {profile.name}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-subtle-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium text-foreground">
            {profile.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          <p className="mt-1 text-[11px] text-subtle-foreground">
            {profile.role} · {profile.company}
          </p>
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

        <DropdownMenuItem onSelect={handleReset}>
          <RotateCcw />
          Reset demo data
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <LogOut />
          Sign out
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <p className="px-2.5 py-1.5 text-[11px] leading-relaxed text-subtle-foreground">
          This build runs unauthenticated on local data. Accounts and sign-out
          arrive with the API integration phase.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
