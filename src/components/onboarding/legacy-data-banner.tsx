"use client";

import * as React from "react";
import { Database, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { importLegacyWorkspace } from "@/app/actions/legacy-import";
import { useAppStore } from "@/lib/store/app-store";

/** The key phase 1 wrote to. Nothing writes it any more. */
const LEGACY_KEY = "performancehub:state";

/** Fired after we clear the key so the subscription re-reads immediately. */
const CHANGED_EVENT = "performancehub:legacy-changed";

interface LegacyPayload {
  websites: unknown[];
  audits: unknown[];
  issues: unknown[];
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED_EVENT, onChange);
  };
}

/**
 * Returns the raw string rather than a parsed object on purpose:
 * `useSyncExternalStore` compares snapshots by identity, and parsing here would
 * hand back a fresh object every call and spin forever.
 */
function getSnapshot(): string | null {
  try {
    return window.localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
}

function parsePayload(raw: string | null): LegacyPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LegacyPayload>;
    if (!Array.isArray(parsed.websites) || parsed.websites.length === 0) {
      return null;
    }
    return {
      websites: parsed.websites,
      audits: Array.isArray(parsed.audits) ? parsed.audits : [],
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch {
    return null;
  }
}

function clearLegacy() {
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage may be unavailable; the banner still hides for this session.
  }
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/**
 * Offers a one-off import of demo data left behind by phase 1.
 *
 * Deliberately never imports automatically: the data belongs to whoever used
 * this browser before, and silently attaching it to whichever account happens
 * to sign in next would be the wrong call. Nothing is deleted until the user
 * chooses.
 */
export function LegacyDataBanner() {
  const { state } = useAppStore();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  // Server snapshot is null: there is no localStorage during SSR, and the
  // banner simply appears after hydration if there is anything to offer.
  const raw = React.useSyncExternalStore(subscribe, getSnapshot, () => null);
  const payload = React.useMemo(() => parsePayload(raw), [raw]);

  if (!payload) return null;

  async function handleImport() {
    if (!payload) return;
    setBusy(true);

    const result = await importLegacyWorkspace(payload);
    setBusy(false);

    if (!result.ok) {
      toast({ tone: "warning", title: "Import failed", description: result.error });
      return;
    }

    clearLegacy();
    const counts = result.data;
    toast({
      tone: "success",
      title: "Local data imported",
      description: counts
        ? `${counts.websites} websites, ${counts.audits} audits and ${counts.issues} findings are now saved to your account.`
        : "Your local data is now saved to your account.",
    });
  }

  function handleDiscard() {
    clearLegacy();
    toast({
      tone: "info",
      title: "Local data discarded",
      description: "Nothing was added to your account.",
    });
  }

  return (
    <Card className="mb-6 border-accent/30 bg-primary-soft/40">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10">
          <Database className="size-4 text-accent" />
        </span>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-foreground">
            Demo data found in this browser
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {payload.websites.length} website
            {payload.websites.length === 1 ? "" : "s"} from before you had an
            account.{" "}
            {state.websites.length > 0
              ? "Importing adds them alongside what you already have."
              : "Import them to keep working, or start fresh."}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={busy}>
            <Trash2 />
            Discard
          </Button>
          <Button size="sm" onClick={handleImport} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Upload />}
            {busy ? "Importing…" : "Import"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
