import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    // Inline scripts/styles are required by Next's prerendered pages and the
    // chart UI. Only the consent-gated Google tag is allowed externally; framing, plug-ins and off-site forms remain blocked.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com" + (process.env.NODE_ENV === "development" ? " ws://localhost:*" : ""),
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
    return [{
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
  turbopack: {
    // Pin the workspace root so Turbopack doesn't walk up to a parent
    // directory that happens to contain a lockfile.
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
