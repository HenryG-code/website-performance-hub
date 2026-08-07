import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BaseProviders } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "PerformanceHub — Website health in one place",
    template: "%s · PerformanceHub",
  },
  description:
    "Monitor performance, SEO, accessibility, uptime and open issues across every website you manage.",
  applicationName: "PerformanceHub",
};

export const viewport: Viewport = {
  themeColor: "#070b16",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout holds only what every route needs — document shell and the toast
 * and tooltip providers. The application chrome and workspace data live in the
 * `(app)` layout so the auth screens render without them.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-background antialiased">
        <BaseProviders>{children}</BaseProviders>
      </body>
    </html>
  );
}
