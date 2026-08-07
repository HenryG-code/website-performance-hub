import { ImageResponse } from "next/og";

/**
 * Apple touch icon.
 *
 * Generated rather than committed as a binary: iOS needs a PNG at a fixed
 * size, and rendering it here keeps the mark defined in one place — change the
 * brand colours and every icon follows.
 *
 * iOS applies its own rounded mask, so the artwork is drawn edge to edge with
 * the glyph inset rather than pre-rounded.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)",
        }}
      >
        <svg
          width="112"
          height="112"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 16.5h4.2l2.6-6.8 4.3 12.2 2.7-7.2 1.7 1.8H26"
            stroke="#ffffff"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
