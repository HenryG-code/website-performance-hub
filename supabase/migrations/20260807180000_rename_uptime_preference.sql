-- The "Uptime incidents" notification promised something the product cannot
-- do: uptime monitoring was removed when the simulated engine was retired, so
-- no probe exists to raise an incident and the toggle could never fire.
--
-- Repurposed to audit failures, which is a real event with a real source and
-- is the thing a user most needs telling about — a failed run means the scores
-- on screen are stale.
alter table public.report_preferences
  rename column notify_uptime_incidents to notify_audit_failed;

comment on column public.report_preferences.notify_audit_failed is
  'Notify when an audit run fails, so the user knows displayed scores are stale.';
