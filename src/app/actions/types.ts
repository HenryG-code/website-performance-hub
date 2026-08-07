/**
 * Uniform result for every server action.
 *
 * Actions return failures rather than throwing, so a validation problem renders
 * inline in the form instead of tripping the route's error boundary.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; errors?: Record<string, string> };
