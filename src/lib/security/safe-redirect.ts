/**
 * Post-authentication redirect sanitiser.
 *
 * `/sign-in?next=…` exists so a user who deep-linked into the app lands back
 * where they were headed. Left unchecked it is an open-redirect: a link like
 * `/sign-in?next=https://evil.example` would bounce a freshly authenticated
 * user off-site, which is a convincing way to phish credentials because the
 * journey genuinely started on the real site.
 *
 * Shared by the server action that performs the redirect and the sign-in form
 * that carries the value, so the two can never disagree — and so an off-site
 * URL never reaches the DOM in the first place.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";

  // Must be an absolute path on this origin. `//host` is protocol-relative and
  // would navigate off-site, and `/\evil.com` is treated as such by some
  // browsers, so both are rejected alongside anything with a scheme.
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";

  // A backslash anywhere in the authority position is normalised to `/` by
  // browsers; refuse rather than try to reason about it.
  if (next.includes("\\")) return "/";

  return next;
}
