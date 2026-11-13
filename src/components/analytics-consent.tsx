"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const ID = "G-Y950SRZHZD";
const KEY = "performancehub-analytics-consent";
type AnalyticsWindow = Window & { dataLayer?: unknown[][]; gtag?: (...args: unknown[]) => void };
const routes: Record<string, string> = { "/": "Dashboard", "/sign-in": "Sign in", "/sign-up": "Sign up", "/forgot-password": "Forgot password", "/reset-password": "Reset password", "/check-email": "Check email", "/websites": "Websites", "/audits": "Audits", "/issues": "Issues", "/reports": "Reports", "/uptime": "Uptime", "/settings": "Settings" };

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function AnalyticsConsent() {
  const pathname = usePathname();
  const [override, setChoice] = useState<string | null>(null);
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  let stored: string | null = null;
  if (ready) { try { stored = localStorage.getItem(KEY); } catch { /* Storage unavailable. */ } }
  const choice = override ?? stored;

  const [editing, setEditing] = useState(false);
  const lastPage = useRef("");



  useEffect(() => {
    if (choice !== "accepted") return;
    const w = window as AnalyticsWindow;
    // Only known route templates are sent. Never transmit account IDs, query
    // strings, fragments, document titles, form values, or client website URLs.
    const route = routes[pathname] ? pathname : /^\/websites\/[^/]+$/.test(pathname) ? "/websites/detail" : /^\/audits\/[^/]+$/.test(pathname) ? "/audits/detail" : "/other";
    const title = routes[route] ?? (route === "/websites/detail" ? "Website detail" : route === "/audits/detail" ? "Audit detail" : "Other page");
    const location = "https://performancehub.weblytics.co.za" + route;
    if (!w.gtag) {
      w.dataLayer = w.dataLayer || [];
      w.gtag = (...args: unknown[]) => { w.dataLayer!.push(args); };
      w.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      w.gtag("js", new Date());
      w.gtag("config", ID, { send_page_view: false, page_location: location, page_title: title, page_referrer: "", allow_google_signals: false, allow_ad_personalization_signals: false, cookie_domain: "performancehub.weblytics.co.za" });
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
      document.head.append(script);
    }
    if (lastPage.current === pathname) return;
    lastPage.current = pathname;
    w.gtag("set", { page_location: location, page_title: title, page_referrer: "" });
    w.gtag("event", "page_view", { send_to: ID, page_location: location, page_title: title, page_referrer: "" });
  }, [choice, pathname]);

  function save(value: string) {
    try { localStorage.setItem(KEY, value); } catch { /* Choice still applies to this page. */ }
    if (value === "essential" && choice === "accepted") {
      (window as unknown as Record<string, unknown>)["ga-disable-" + ID] = true;
      // Reload removes the already-loaded library after withdrawal.
      setChoice(value); setEditing(false); window.location.reload(); return;
    }
    setChoice(value); setEditing(false);
  }

  if (!ready) return null;
  if (choice && !editing) return <button type="button" className="fixed bottom-2 left-2 z-40 min-h-11 rounded-lg border border-border bg-surface px-3 text-xs text-muted-foreground" onClick={() => setEditing(true)}>Cookie settings</button>;
  return <section aria-label="Analytics cookie preferences" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border border-border bg-surface p-4 text-foreground shadow-xl sm:p-5">
    <h2 className="text-sm font-semibold">Help improve PerformanceHub</h2>
    <p className="mt-2 text-sm text-muted-foreground">With your permission, Google Analytics measures visits to general app pages. We exclude client names, website addresses, account details and form contents. Essential cookies keep you signed in either way.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button size="lg" variant="secondary" onClick={() => save("essential")}>Essential only</Button>
      <Button size="lg" onClick={() => save("accepted")}>Allow analytics</Button>
    </div>
  </section>;
}
