"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { createWebsite, deleteWebsite, updateWebsite } from "@/app/actions/websites";
import { completeAudit, startAudit } from "@/app/actions/audits";
import { setIssueStatus as setIssueStatusAction } from "@/app/actions/issues";
import {
  updateNotifications,
  updateProfile,
  updateReportPreferences,
} from "@/app/actions/settings";
import { seedDemoWorkspace } from "@/app/actions/dev-seed";
import { AUDIT_SIMULATION_MS } from "@/lib/audit/simulate";
import type { ActionResult } from "@/app/actions/types";
import type { WebsiteInput } from "@/lib/validation";
import type { AppState, Issue, IssueStatus, SettingsPatch } from "@/types";

interface AppStoreValue {
  /** The signed-in user's workspace, loaded server-side on every navigation. */
  state: AppState;
  /** True while any mutation or refresh is in flight. */
  pending: boolean;
  addWebsite: (input: WebsiteInput) => Promise<ActionResult<{ id: string }>>;
  editWebsite: (id: string, input: WebsiteInput) => Promise<ActionResult>;
  removeWebsite: (id: string) => Promise<ActionResult>;
  runAudit: (websiteId: string) => Promise<ActionResult>;
  isAuditing: (websiteId: string) => boolean;
  setIssueStatus: (id: string, status: IssueStatus) => Promise<ActionResult>;
  updateSettings: (patch: SettingsPatch) => Promise<ActionResult>;
  /** Development helper; disabled in production builds. */
  seedDemoData: () => Promise<ActionResult>;
  canSeedDemoData: boolean;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

const CAN_SEED = process.env.NODE_ENV !== "production";

export function AppStoreProvider({
  initialState,
  children,
}: {
  initialState: AppState;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [runningSites, setRunningSites] = useState<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /**
   * Issue-status edits applied locally the instant they are made.
   *
   * A server round-trip plus `router.refresh()` takes long enough that a select
   * would visibly snap back to its old value first. The override is dropped as
   * soon as the refreshed server data agrees with it.
   */
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, IssueStatus>
  >({});

  const state = useMemo<AppState>(() => {
    if (Object.keys(statusOverrides).length === 0) return initialState;

    return {
      ...initialState,
      issues: initialState.issues.map((issue): Issue => {
        const override = statusOverrides[issue.id];
        return override && override !== issue.status
          ? { ...issue, status: override }
          : issue;
      }),
    };
  }, [initialState, statusOverrides]);

  // Once the server confirms an override, stop overlaying it.
  const settled = Object.entries(statusOverrides).filter(([id, status]) =>
    initialState.issues.some(
      (issue) => issue.id === id && issue.status === status,
    ),
  );
  if (settled.length > 0) {
    setStatusOverrides((prev) => {
      const next = { ...prev };
      for (const [id] of settled) delete next[id];
      return next;
    });
  }

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const addWebsite = useCallback(
    async (input: WebsiteInput) => {
      const result = await createWebsite(input);
      if (result.ok) refresh();
      return result;
    },
    [refresh],
  );

  const editWebsite = useCallback(
    async (id: string, input: WebsiteInput) => {
      const result = await updateWebsite(id, input);
      if (result.ok) refresh();
      return result;
    },
    [refresh],
  );

  const removeWebsite = useCallback(
    async (id: string) => {
      const result = await deleteWebsite(id);
      if (result.ok) refresh();
      return result;
    },
    [refresh],
  );

  /**
   * Two-phase run: the `running` row appears immediately, then resolves after a
   * short delay. The delay is cosmetic for now — when real Lighthouse runs
   * arrive, the completion step becomes a webhook or poll instead.
   */
  const runAudit = useCallback(
    async (websiteId: string): Promise<ActionResult> => {
      if (runningSites.includes(websiteId)) {
        return { ok: false, error: "An audit is already running for that site." };
      }

      setRunningSites((prev) => [...prev, websiteId]);
      const started = await startAudit(websiteId);

      if (!started.ok) {
        setRunningSites((prev) => prev.filter((id) => id !== websiteId));
        return started;
      }

      refresh();
      const auditId = started.data!.auditId;

      const timer = setTimeout(async () => {
        await completeAudit(auditId);
        setRunningSites((prev) => prev.filter((id) => id !== websiteId));
        refresh();
      }, AUDIT_SIMULATION_MS);

      timers.current.push(timer);
      return { ok: true };
    },
    [runningSites, refresh],
  );

  const isAuditing = useCallback(
    (websiteId: string) => runningSites.includes(websiteId),
    [runningSites],
  );

  const setIssueStatus = useCallback(
    async (id: string, status: IssueStatus) => {
      setStatusOverrides((prev) => ({ ...prev, [id]: status }));

      const result = await setIssueStatusAction(id, status);
      if (!result.ok) {
        // Roll the optimistic change back so the UI never claims a save that
        // did not happen.
        setStatusOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        return result;
      }

      refresh();
      return result;
    },
    [refresh],
  );

  const updateSettings = useCallback(
    async (patch: SettingsPatch) => {
      const calls: Promise<ActionResult>[] = [];

      if (patch.profile) calls.push(updateProfile(patch.profile));
      if (patch.notifications) calls.push(updateNotifications(patch.notifications));

      const reportPatch = {
        ...(patch.reportTitle !== undefined && { reportTitle: patch.reportTitle }),
        ...(patch.brandName !== undefined && { brandName: patch.brandName }),
        ...(patch.auditFrequency !== undefined && {
          auditFrequency: patch.auditFrequency,
        }),
        ...(patch.defaultDevice !== undefined && {
          defaultDevice: patch.defaultDevice,
        }),
        ...(patch.scoreThreshold !== undefined && {
          scoreThreshold: patch.scoreThreshold,
        }),
      };
      if (Object.keys(reportPatch).length > 0) {
        calls.push(updateReportPreferences(reportPatch));
      }

      if (calls.length === 0) return { ok: true } as ActionResult;

      const results = await Promise.all(calls);
      const failure = results.find((result) => !result.ok);
      if (failure) return failure;

      refresh();
      return { ok: true } as ActionResult;
    },
    [refresh],
  );

  const seedDemoData = useCallback(async () => {
    const result = await seedDemoWorkspace();
    if (result.ok) refresh();
    return result;
  }, [refresh]);

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      pending,
      addWebsite,
      editWebsite,
      removeWebsite,
      runAudit,
      isAuditing,
      setIssueStatus,
      updateSettings,
      seedDemoData,
      canSeedDemoData: CAN_SEED,
    }),
    [
      state,
      pending,
      addWebsite,
      editWebsite,
      removeWebsite,
      runAudit,
      isAuditing,
      setIssueStatus,
      updateSettings,
      seedDemoData,
    ],
  );

  return (
    <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error("useAppStore must be used inside <AppStoreProvider>");
  }
  return ctx;
}
