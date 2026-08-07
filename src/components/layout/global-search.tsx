"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Bug, Globe, Search, SearchX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { SeverityBadge } from "@/components/shared/badges";
import { useAppStore } from "@/lib/store/app-store";
import { displayUrl, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Result {
  id: string;
  group: "Websites" | "Issues" | "Audits";
  title: string;
  subtitle: string;
  href: string;
  icon: React.ElementType;
  meta?: React.ReactNode;
}

const MAX_PER_GROUP = 5;

/**
 * Command-palette style global search over websites, issues and audits.
 * Opens from the top bar or with Cmd/Ctrl+K.
 */
export function GlobalSearch() {
  const router = useRouter();
  const { state } = useAppStore();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [cursor, setCursor] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Clearing on close happens in the change handler rather than an effect, so
  // the reset lands in the same commit as the close.
  const setOpenAndReset = React.useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setCursor(0);
    }
  }, []);

  const results = React.useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const websites: Result[] = state.websites
      .filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.url.toLowerCase().includes(q) ||
          w.team.toLowerCase().includes(q),
      )
      .slice(0, MAX_PER_GROUP)
      .map((w) => ({
        id: w.id,
        group: "Websites",
        title: w.name,
        subtitle: displayUrl(w.url),
        href: `/websites/${w.id}`,
        icon: Globe,
      }));

    const issues: Result[] = state.issues
      .filter(
        (i) =>
          i.title.toLowerCase().includes(q) || i.ruleId.toLowerCase().includes(q),
      )
      .slice(0, MAX_PER_GROUP)
      .map((i) => ({
        id: i.id,
        group: "Issues",
        title: i.title,
        subtitle:
          state.websites.find((w) => w.id === i.websiteId)?.name ?? "Unknown site",
        href: `/issues?issue=${i.id}`,
        icon: Bug,
        meta: <SeverityBadge severity={i.severity} size="sm" />,
      }));

    const audits: Result[] = state.audits
      .filter((a) => {
        const site = state.websites.find((w) => w.id === a.websiteId);
        return (
          a.id.toLowerCase().includes(q) ||
          (site?.name.toLowerCase().includes(q) ?? false)
        );
      })
      .slice(0, MAX_PER_GROUP)
      .map((a) => ({
        id: a.id,
        group: "Audits",
        title:
          state.websites.find((w) => w.id === a.websiteId)?.name ?? "Audit run",
        subtitle: `${a.id} · ${formatRelative(a.startedAt)}`,
        href: `/audits/${a.id}`,
        icon: BarChart3,
      }));

    return [...websites, ...issues, ...audits];
  }, [query, state]);

  const select = React.useCallback(
    (result: Result) => {
      setOpenAndReset(false);
      router.push(result.href);
    },
    [router, setOpenAndReset],
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[cursor];
      if (target) select(target);
    }
  }

  let lastGroup = "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm",
          "text-subtle-foreground transition-colors hover:border-border-strong hover:text-muted-foreground",
          "w-full md:w-64 lg:w-80",
        )}
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search…</span>
        <kbd className="hidden shrink-0 rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-subtle-foreground sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpenAndReset}>
        <DialogContent
          hideClose
          className="top-24 max-w-xl translate-y-0 p-0"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <DialogTitle className="sr-only">Search PerformanceHub</DialogTitle>
          <DialogDescription className="sr-only">
            Search across websites, issues and audit runs.
          </DialogDescription>

          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-subtle-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCursor(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search websites, issues, audits…"
              aria-label="Search websites, issues and audits"
              className="h-12 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
            />
            <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px] text-subtle-foreground">
              ESC
            </kbd>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {query.trim() === "" ? (
              <EmptyState
                compact
                icon={Search}
                title="Start typing to search"
                description="Find a website, jump to an audit run, or pull up an issue by name or rule ID."
              />
            ) : results.length === 0 ? (
              <EmptyState
                compact
                icon={SearchX}
                title={`No matches for “${query.trim()}”`}
                description="Try a site name, a rule ID such as color-contrast, or an audit ID."
              />
            ) : (
              <ul role="listbox" aria-label="Search results">
                {results.map((result, index) => {
                  const showHeading = result.group !== lastGroup;
                  lastGroup = result.group;
                  const Icon = result.icon;

                  return (
                    <li key={`${result.group}-${result.id}`}>
                      {showHeading ? (
                        <p className="px-2 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-subtle-foreground uppercase">
                          {result.group}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        role="option"
                        aria-selected={index === cursor}
                        onMouseEnter={() => setCursor(index)}
                        onClick={() => select(result)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                          index === cursor ? "bg-hover" : "hover:bg-elevated",
                        )}
                      >
                        <Icon className="size-4 shrink-0 text-subtle-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">
                            {result.title}
                          </span>
                          <span className="block truncate text-xs text-subtle-foreground">
                            {result.subtitle}
                          </span>
                        </span>
                        {result.meta}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
