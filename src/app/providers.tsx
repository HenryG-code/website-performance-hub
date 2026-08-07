"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";

/** Providers needed by both the auth screens and the application shell. */
export function BaseProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <TooltipProvider delayDuration={200} skipDelayDuration={300}>
        {children}
      </TooltipProvider>
    </ToastProvider>
  );
}
