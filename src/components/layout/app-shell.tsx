"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileTabBar } from "./mobile-nav";

/**
 * Application chrome: fixed sidebar on desktop, sticky top bar everywhere, and
 * a bottom tab bar on phones. Page content is constrained and padded here so
 * individual routes only care about their own layout.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />

      <div className="lg:pl-64">
        <Topbar />
        <main className="surface-glow min-h-[calc(100dvh-4rem)] px-4 pt-6 pb-24 sm:px-6 sm:pb-12 lg:px-8">
          <div className="mx-auto w-full max-w-[88rem]">{children}</div>
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}
