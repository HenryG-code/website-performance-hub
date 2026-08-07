const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * All date formatting uses UTC getters on purpose. `toLocaleString` resolves
 * against the host timezone/locale, which differs between the Node render and
 * the browser render and produces hydration warnings.
 */
export function formatDate(value: string | Date): string {
  const d = toDate(value);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatShortDate(value: string | Date): string {
  const d = toDate(value);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatDateTime(value: string | Date): string {
  const d = toDate(value);
  return `${formatDate(d)} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export function formatTime(value: string | Date): string {
  const d = toDate(value);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/**
 * Relative time against the real clock, now that timestamps come from the
 * database rather than a generated dataset. Future timestamps clamp to
 * "Just now" rather than rendering a negative interval.
 */
export function formatRelative(value: string | Date): string {
  const d = toDate(value);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";

  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return `${Math.floor(months / 12)}y ago`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}m ${pad(rest)}s`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/**
 * Millisecond durations, switching to seconds once they get long enough that
 * four digits stop being readable.
 */
export function formatMs(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${Math.round(value)}ms`;
}

/** Seconds, as Lighthouse reports paint timings. */
export function formatSeconds(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}s`;
}

export function formatNumber(value: number): string {
  // Manual grouping keeps output locale-independent for SSR safety.
  const [whole, fraction] = String(value).split(".");
  const grouped = (whole ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

/** Strips protocol and trailing slash for compact display of a site URL. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
