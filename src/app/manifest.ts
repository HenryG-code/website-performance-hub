import type { MetadataRoute } from "next";

/**
 * Web app manifest.
 *
 * The product is a dashboard people return to daily, so it is worth being
 * installable. `standalone` drops browser chrome, and the theme colour matches
 * the app background so the status bar does not band against it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PerformanceHub — Website health",
    short_name: "PerformanceHub",
    description:
      "Monitor performance, SEO, accessibility and Core Web Vitals across every website you manage, measured by Google PageSpeed Insights.",
    start_url: "/",
    display: "standalone",
    background_color: "#070b16",
    theme_color: "#070b16",
    orientation: "portrait-primary",
    categories: ["productivity", "developer", "business"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
