"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { STORAGE_KEY, STORAGE_VERSION } from "@/lib/constants";
import { createSeedState } from "@/lib/mock/generate";
import type { IssueStatus, PersistedState, SettingsPatch } from "@/types";
import { reducer, type Action, type NewWebsiteInput } from "./reducer";

/** How long a simulated audit takes before it resolves. */
const AUDIT_DURATION_MS = 2600;

interface AppStoreValue {
  state: PersistedState;
  /** False during the first client render, before localStorage is read. */
  hydrated: boolean;
  addWebsite: (input: NewWebsiteInput) => string;
  removeWebsite: (id: string) => void;
  runAudit: (websiteId: string) => string | null;
  isAuditing: (websiteId: string) => boolean;
  setIssueStatus: (id: string, status: IssueStatus) => void;
  updateSettings: (patch: SettingsPatch) => void;
  resetData: () => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

/**
 * The initial state is the deterministic seed on both server and client, so the
 * first paint matches the SSR output exactly. Persisted state is merged in from
 * localStorage in an effect immediately afterwards.
 */
function loadPersisted(): PersistedState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed?.version !== STORAGE_VERSION) return null;
    if (!Array.isArray(parsed.websites)) return null;
    return parsed;
  } catch {
    // Corrupt or unavailable storage falls back to the seed dataset.
    return null;
  }
}

interface StoreState {
  data: PersistedState;
  hydrated: boolean;
}

/**
 * Wraps the domain reducer with the hydration flag, so reading localStorage on
 * mount is a single dispatch rather than a separate `setState` in an effect.
 */
function storeReducer(state: StoreState, action: Action): StoreState {
  if (action.type === "hydrate") {
    return { data: action.state ?? state.data, hydrated: true };
  }
  return { ...state, data: reducer(state.data, action) };
}

function initialStore(): StoreState {
  return { data: createSeedState(), hydrated: false };
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [store, dispatch] = useReducer(storeReducer, undefined, initialStore);
  const [runningSites, setRunningSites] = useState<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { data: state, hydrated } = store;

  useEffect(() => {
    dispatch({ type: "hydrate", state: loadPersisted() });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota errors are non-fatal — the app keeps working in memory.
    }
  }, [state, hydrated]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const addWebsite = useCallback((input: NewWebsiteInput) => {
    const id = `wsite-${Date.now().toString(36)}`;
    dispatch({
      type: "website/add",
      input,
      id,
      at: new Date().toISOString(),
    });
    return id;
  }, []);

  const removeWebsite = useCallback((id: string) => {
    dispatch({ type: "website/remove", id });
  }, []);

  const runAudit = useCallback(
    (websiteId: string) => {
      if (runningSites.includes(websiteId)) return null;

      const auditId = `audit-run-${Date.now().toString(36)}`;
      setRunningSites((prev) => [...prev, websiteId]);
      dispatch({
        type: "audit/start",
        websiteId,
        auditId,
        at: new Date().toISOString(),
      });

      const timer = setTimeout(() => {
        dispatch({
          type: "audit/complete",
          auditId,
          seed: Math.floor(Math.random() * 2 ** 31),
        });
        setRunningSites((prev) => prev.filter((id) => id !== websiteId));
      }, AUDIT_DURATION_MS);

      timers.current.push(timer);
      return auditId;
    },
    [runningSites],
  );

  const isAuditing = useCallback(
    (websiteId: string) => runningSites.includes(websiteId),
    [runningSites],
  );

  const setIssueStatus = useCallback((id: string, status: IssueStatus) => {
    dispatch({
      type: "issue/status",
      id,
      status,
      at: new Date().toISOString(),
    });
  }, []);

  const updateSettings = useCallback((patch: SettingsPatch) => {
    dispatch({ type: "settings/update", patch });
  }, []);

  const resetData = useCallback(() => {
    dispatch({ type: "reset", state: createSeedState() });
  }, []);

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      hydrated,
      addWebsite,
      removeWebsite,
      runAudit,
      isAuditing,
      setIssueStatus,
      updateSettings,
      resetData,
    }),
    [
      state,
      hydrated,
      addWebsite,
      removeWebsite,
      runAudit,
      isAuditing,
      setIssueStatus,
      updateSettings,
      resetData,
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

export type { Action, NewWebsiteInput };
