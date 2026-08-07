/**
 * Audit throttling rules.
 *
 * Kept as plain constants and pure predicates so the policy is visible in one
 * place and testable without a database.
 */

/** Audits one user may start per rolling hour, across all their websites. */
export const MAX_AUDITS_PER_HOUR = 30;

/** Audits one user may start per rolling day. Guards the shared PSI quota. */
export const MAX_AUDITS_PER_DAY = 200;

/**
 * How long the same website+strategy must wait between runs.
 *
 * PageSpeed results barely move minute to minute, so a short cooldown removes
 * accidental double-runs and repeated clicking without getting in the way.
 */
export const AUDIT_COOLDOWN_MS = 60_000;

/**
 * A run stuck in `running` for longer than this is treated as abandoned.
 *
 * The provider call has a 90s timeout, so anything past this window means the
 * process died mid-run and the row will never be resolved by its own request.
 */
export const STALE_RUNNING_MS = 5 * 60_000;

export type ThrottleReason =
  | "already-running"
  | "cooldown"
  | "hourly-limit"
  | "daily-limit";

export interface ThrottleDecision {
  allowed: boolean;
  reason?: ThrottleReason;
  message?: string;
  /** Seconds until the caller may retry, when that is knowable. */
  retryAfterSeconds?: number;
}

export const ALLOWED: ThrottleDecision = { allowed: true };

export interface ThrottleInput {
  /** A non-stale run already in flight for this website and strategy. */
  hasRunningAudit: boolean;
  /** Start time of the most recent run for this website+strategy, if any. */
  lastRunStartedAt: Date | null;
  auditsInLastHour: number;
  auditsInLastDay: number;
  now: Date;
}

export function evaluateThrottle({
  hasRunningAudit,
  lastRunStartedAt,
  auditsInLastHour,
  auditsInLastDay,
  now,
}: ThrottleInput): ThrottleDecision {
  if (hasRunningAudit) {
    return {
      allowed: false,
      reason: "already-running",
      message: "An audit is already running for this website and device.",
    };
  }

  if (lastRunStartedAt) {
    const elapsed = now.getTime() - lastRunStartedAt.getTime();
    if (elapsed < AUDIT_COOLDOWN_MS) {
      const wait = Math.ceil((AUDIT_COOLDOWN_MS - elapsed) / 1000);
      return {
        allowed: false,
        reason: "cooldown",
        message: `This website was audited moments ago. Try again in ${wait}s.`,
        retryAfterSeconds: wait,
      };
    }
  }

  if (auditsInLastDay >= MAX_AUDITS_PER_DAY) {
    return {
      allowed: false,
      reason: "daily-limit",
      message: `You've reached the limit of ${MAX_AUDITS_PER_DAY} audits per day.`,
    };
  }

  if (auditsInLastHour >= MAX_AUDITS_PER_HOUR) {
    return {
      allowed: false,
      reason: "hourly-limit",
      message: `You've reached the limit of ${MAX_AUDITS_PER_HOUR} audits per hour. Try again shortly.`,
    };
  }

  return ALLOWED;
}
