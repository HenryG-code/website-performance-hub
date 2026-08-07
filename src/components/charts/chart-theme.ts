import type { CSSProperties } from "react";

/**
 * Shared Recharts styling. Recharts renders inline SVG rather than Tailwind
 * classes, so the design tokens are mirrored here as plain values and reused by
 * every chart to keep axes, grids and tooltips visually identical.
 */
export const GRID_STROKE = "#1d2a45";
export const AXIS_STROKE = "#64748b";

export const axisTick = {
  fill: "#64748b",
  fontSize: 11,
} as const;

export const tooltipContentStyle: CSSProperties = {
  background: "#131e31",
  border: "1px solid #2a3a5c",
  borderRadius: 10,
  boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
  padding: "10px 12px",
};

export const tooltipLabelStyle: CSSProperties = {
  color: "#e8eef9",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
};

export const tooltipItemStyle: CSSProperties = {
  fontSize: 12,
  padding: "1px 0",
};

export const tooltipCursor = {
  stroke: "#2a3a5c",
  strokeWidth: 1,
  strokeDasharray: "4 4",
};

export const barCursor = { fill: "rgba(56,189,248,0.06)" };
