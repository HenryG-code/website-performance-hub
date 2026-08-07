/**
 * Environment access for the Supabase clients.
 *
 * Reading `process.env.NEXT_PUBLIC_*` by its full literal name is required —
 * Next.js inlines these at build time by static text substitution, so
 * `process.env[someVariable]` would silently produce `undefined` in the browser.
 */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in your Supabase project values.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
}

export function supabaseAnonKey(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

/**
 * Origin used to build links in confirmation and password-reset emails.
 * Falls back to the Vercel-provided URL, then to localhost for development.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
