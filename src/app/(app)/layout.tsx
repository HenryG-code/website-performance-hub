import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/data/workspace";
import { AppStoreProvider } from "@/lib/store/app-store";
import { AppShell } from "@/components/layout/app-shell";
import { LegacyDataBanner } from "@/components/onboarding/legacy-data-banner";

/**
 * Gate and data boundary for every application route.
 *
 * The middleware already redirects unauthenticated requests, but this check is
 * not redundant: middleware can be bypassed by rewrites and misconfigured
 * matchers, so the layout that actually renders private data verifies the user
 * itself. `getUser()` revalidates the token rather than trusting the cookie.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/sign-in");

  const workspace = await getWorkspace(user.id, user.email ?? "");

  return (
    <AppStoreProvider initialState={workspace}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-100 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <AppShell>
        <div id="main-content">
          <LegacyDataBanner />
          {children}
        </div>
      </AppShell>
    </AppStoreProvider>
  );
}
