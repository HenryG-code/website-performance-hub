import { ImageResponse } from "next/og";

/**
 * Link preview card, used for Open Graph and Twitter alike.
 *
 * Generated at request time from the same tokens the app uses, so a brand
 * change cannot leave a stale PNG behind. Deliberately states what the product
 * measures with — a shared link should set an accurate expectation before
 * anyone clicks.
 */
export const alt =
  "PerformanceHub — website health from real Google PageSpeed data";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#070b16",
          backgroundImage:
            "radial-gradient(120% 90% at 85% 0%, rgba(37,99,235,0.28) 0%, rgba(7,11,22,0) 60%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
              <path
                d="M6 16.5h4.2l2.6-6.8 4.3 12.2 2.7-7.2 1.7 1.8H26"
                stroke="#ffffff"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 38, fontWeight: 700, color: "#e8eef9" }}>
              PerformanceHub
            </div>
            <div
              style={{
                fontSize: 18,
                color: "#8090ab",
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Website health
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 62,
              fontWeight: 700,
              color: "#e8eef9",
              lineHeight: 1.1,
              letterSpacing: -1.5,
              maxWidth: 900,
            }}
          >
            Know exactly how healthy every website you manage is.
          </div>
          <div style={{ fontSize: 26, color: "#93a3c0", maxWidth: 860 }}>
            Performance, SEO, accessibility and best practices — measured by
            Google PageSpeed Insights, never estimated.
          </div>
        </div>

        {/* Category chips, in the same order the dashboard shows them */}
        <div style={{ display: "flex", gap: 14 }}>
          {[
            ["Performance", "#818cf8"],
            ["SEO", "#34d399"],
            ["Accessibility", "#fbbf24"],
            ["Best Practices", "#f472b6"],
          ].map(([label, colour]) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                borderRadius: 999,
                border: "1px solid #1d2a45",
                background: "#0c1322",
                fontSize: 22,
                color: "#93a3c0",
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: colour,
                }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
