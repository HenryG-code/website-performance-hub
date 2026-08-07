-- Production hardening for live audits.
--
-- Two problems this fixes, both found while testing repeat runs:
--
-- 1. Findings were deleted and re-inserted wholesale on every run, which
--    destroyed the user's triage state (In Progress / Ignored) and stripped
--    findings from previous audits' detail pages. Findings are now reconciled
--    per strategy, which needs the strategy recorded on the row.
--
-- 2. Duplicate-run prevention was a check-then-insert, so two concurrent
--    requests could both pass the check. A partial unique index makes it
--    impossible for the same website and strategy to have two live runs.

-- --------------------------------------------------- strategy on findings
-- Nullable: rows from the retired simulated engine have no strategy, and
-- inventing one for them would be a lie.
alter table public.issues
  add column device public.device_type;

comment on column public.issues.device is
  'PageSpeed strategy of the audit that reported this finding. Null for rows from the retired simulated engine.';

-- Backfill from the audit that reported each finding.
update public.issues i
set device = a.device
from public.audits a
where i.audit_id = a.id
  and i.provider = 'pagespeed'
  and i.device is null;

-- Reconciliation looks findings up by website, strategy and rule on every run.
create index issues_reconcile_idx
  on public.issues (website_id, device, rule_id)
  where provider = 'pagespeed';

-- ------------------------------------------------- one live run at a time
-- Resolve anything already abandoned first: the unique index below would fail
-- to build if a website somehow already had two live runs recorded.
update public.audits
set status = 'failed',
    failure_reason = 'The audit did not finish. Run it again.',
    error_code = 'abandoned'
where status = 'running'
  and started_at < now() - interval '5 minutes';

-- Closes the race between checking for a running audit and inserting one.
-- A second concurrent request now fails with a unique violation, which the
-- action translates into the same "already running" message.
--
-- Stale rows are reaped before a run is claimed, so an abandoned run cannot
-- block this index permanently.
create unique index audits_one_running_per_target_idx
  on public.audits (website_id, device)
  where status = 'running';
