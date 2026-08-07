import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BaseProviders } from "./providers";

const DESCRIPTION =
  "Monitor performance, SEO, accessibility and Core Web Vitals across every website you manage. Every score comes from a real Google PageSpeed Insights run.";

export const metadata: Metadata = {
  /*
   * Required for Open Graph and Twitter image URLs to resolve absolutely.
   * Without it Next emits relative paths, which most link unfurlers ignore, so
   * shared links render with no preview at all.
   */
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "PerformanceHub — Website health in one place",
    template: "%s · PerformanceHub",
  },
  description: DESCRIPTION,
  applicationName: "PerformanceHub",
  keywords: [
    "website performance",
    "Core Web Vitals",
    "Lighthouse",
    "PageSpeed Insights",
    "SEO audit",
    "accessibility audit",
  ],
  openGraph: {
    type: "website",
    siteName: "PerformanceHub",
    title: "PerformanceHub — Website health in one place",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "PerformanceHub — Website health in one place",
    description: DESCRIPTION,
  },
  /*
   * The product is entirely behind authentication and every page shows one
   * user's private data, so there is nothing worth indexing and a fair amount
   * worth keeping out of search results.
   */
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "PerformanceHub",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#070b16",
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom must stay available; capping it would fail WCAG 1.4.4.
  maximumScale: 5,
  colorScheme: "dark",
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
