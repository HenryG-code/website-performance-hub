-- PerformanceHub — measured uptime monitoring
--
-- PageSpeed scores describe a synthetic audit, not whether a site is reachable.
-- Uptime lives in its own model so those two facts can never be conflated.

create type public.uptime_monitor_state as enum (
  'pending',
  'up',
  'degraded',
  'down',
  'paused'
);

-- One optional monitor per website. The current state is deliberately kept on
-- this compact row; historical data is aggregated daily below.
create table public.uptime_monitors (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  interval_minutes smallint not null default 60
    check (interval_minutes between 5 and 1440),
  timeout_ms integer not null default 10000
    check (timeout_ms between 1000 and 30000),
  expected_status_min smallint not null default 200
    check (expected_status_min between 100 and 599),
  expected_status_max smallint not null default 399
    check (expected_status_max between 100 and 599 and expected_status_max >= expected_status_min),
  state public.uptime_monitor_state not null default 'paused',
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_status_code smallint check (last_status_code between 100 and 599),
  last_response_ms integer check (last_response_ms >= 0),
  last_error text check (char_length(last_error) <= 500),
  consecutive_failures smallint not null default 0 check (consecutive_failures >= 0),
  next_check_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uptime_monitors_one_per_website unique (website_id),
  constraint uptime_monitors_id_owner_key unique (id, owner_id),
  constraint uptime_monitors_website_owner_fkey
    foreign key (website_id, owner_id)
    references public.websites (id, owner_id)
    on delete cascade
);

create index uptime_monitors_due_idx
  on public.uptime_monitors (next_check_at)
  where enabled;

create trigger uptime_monitors_set_updated_at
  before update on public.uptime_monitors
  for each row execute function public.set_updated_at();

-- A daily roll-up replaces a raw event row for every ping. It makes a year of
-- hourly monitoring for eight sites only 2,920 rows instead of 70,080.
create table public.uptime_daily (
  monitor_id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  check_count smallint not null default 0 check (check_count >= 0),
  success_count smallint not null default 0 check (success_count between 0 and check_count),
  response_sample_count smallint not null default 0
    check (response_sample_count between 0 and check_count),
  response_total_ms bigint not null default 0 check (response_total_ms >= 0),
  response_min_ms integer check (response_min_ms >= 0),
  response_max_ms integer check (response_max_ms >= 0),
  last_checked_at timestamptz not null,

  primary key (monitor_id, day),
  constraint uptime_daily_monitor_owner_fkey
    foreign key (monitor_id, owner_id)
    references public.uptime_monitors (id, owner_id)
    on delete cascade
);

create index uptime_daily_owner_day_idx
  on public.uptime_daily (owner_id, day desc);

-- Incidents are created only for confirmed outages, then closed on recovery.
-- This is the durable history used in the UI and future alert delivery.
create table public.uptime_incidents (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  detected_at timestamptz not null default now(),
  recovered_at timestamptz,
  initial_error text not null default '' check (char_length(initial_error) <= 500),
  final_status_code smallint check (final_status_code between 100 and 599),
  created_at timestamptz not null default now(),

  constraint uptime_incidents_monitor_owner_fkey
    foreign key (monitor_id, owner_id)
    references public.uptime_monitors (id, owner_id)
    on delete cascade,
  constraint uptime_incidents_recovery_after_detection
    check (recovered_at is null or recovered_at >= detected_at)
);

create unique index uptime_incidents_one_open_per_monitor_idx
  on public.uptime_incidents (monitor_id)
  where recovered_at is null;

create index uptime_incidents_owner_detected_idx
  on public.uptime_incidents (owner_id, detected_at desc);

-- All user-facing reads and monitor configuration remain protected by RLS.
alter table public.uptime_monitors enable row level security;
alter table public.uptime_daily enable row level security;
alter table public.uptime_incidents enable row level security;

-- Tables created after Supabase's initial bootstrap do not automatically inherit
-- the application-role grants. RLS below still limits every row to its owner.
grant select, insert, update, delete on public.uptime_monitors to authenticated;
grant select on public.uptime_daily to authenticated;
grant select on public.uptime_incidents to authenticated;
alter table public.uptime_monitors force row level security;
alter table public.uptime_daily force row level security;
alter table public.uptime_incidents force row level security;

create policy "Users can manage their uptime monitors"
  on public.uptime_monitors
  for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can read their uptime roll-ups"
  on public.uptime_daily
  for select
  using ((select auth.uid()) = owner_id);

create policy "Users can read their uptime incidents"
  on public.uptime_incidents
  for select
  using ((select auth.uid()) = owner_id);

-- Atomically claim a bounded batch. Moving next_check_at while claiming makes
-- duplicate cron delivery and overlapping invocations harmless.
create or replace function public.claim_due_uptime_monitors(p_limit integer default 25)
returns table (
  monitor_id uuid,
  target_url text,
  timeout_ms integer,
  expected_status_min smallint,
  expected_status_max smallint
)
language sql
security definer
set search_path = ''
as $$
  with due as (
    select
      monitor.id,
      website.url,
      monitor.timeout_ms,
      monitor.expected_status_min,
      monitor.expected_status_max
    from public.uptime_monitors as monitor
    join public.websites as website on website.id = monitor.website_id
    where monitor.enabled
      and (monitor.next_check_at is null or monitor.next_check_at <= pg_catalog.now())
    order by monitor.next_check_at asc nulls first, monitor.created_at asc
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
    for update of monitor skip locked
  ), claimed as (
    update public.uptime_monitors as monitor
    set next_check_at = pg_catalog.now()
      + pg_catalog.make_interval(mins => monitor.interval_minutes)
    from due
    where monitor.id = due.id
    returning
      monitor.id as monitor_id,
      due.url as target_url,
      due.timeout_ms,
      due.expected_status_min,
      due.expected_status_max
  )
  select * from claimed;
$$;

revoke all on function public.claim_due_uptime_monitors(integer) from public;
grant execute on function public.claim_due_uptime_monitors(integer) to service_role;

-- Records a result, updates the compact current state, rolls it into the
-- current UTC day, and opens/closes incidents only on confirmed transitions.
create or replace function public.record_uptime_check(
  p_monitor_id uuid,
  p_status_code integer default null,
  p_response_ms integer default null,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  monitor public.uptime_monitors%rowtype;
  checked_at timestamptz := pg_catalog.now();
  succeeded boolean;
  failures smallint;
  next_state public.uptime_monitor_state;
  error_message text := left(coalesce(p_error, ''), 500);
begin
  select * into monitor
  from public.uptime_monitors
  where id = p_monitor_id
  for update;

  if not found or not monitor.enabled then
    return;
  end if;

  succeeded := p_error is null
    and p_status_code between monitor.expected_status_min and monitor.expected_status_max;
  failures := case when succeeded then 0 else monitor.consecutive_failures + 1 end;
  next_state := case
    when succeeded then 'up'::public.uptime_monitor_state
    when failures >= 2 then 'down'::public.uptime_monitor_state
    else 'degraded'::public.uptime_monitor_state
  end;

  update public.uptime_monitors
  set
    state = next_state,
    last_checked_at = checked_at,
    last_success_at = case when succeeded then checked_at else last_success_at end,
    last_status_code = case when p_status_code between 100 and 599 then p_status_code::smallint else null end,
    last_response_ms = case
      when p_response_ms is null then null
      else greatest(p_response_ms, 0)
    end,
    last_error = case when succeeded then null else nullif(error_message, '') end,
    consecutive_failures = failures
  where id = monitor.id;

  insert into public.uptime_daily (
    monitor_id, owner_id, day, check_count, success_count,
    response_sample_count, response_total_ms, response_min_ms,
    response_max_ms, last_checked_at
  ) values (
    monitor.id,
    monitor.owner_id,
    checked_at::date,
    1,
    case when succeeded then 1 else 0 end,
    case when p_response_ms is null then 0 else 1 end,
    greatest(coalesce(p_response_ms, 0), 0),
    case when p_response_ms is null then null else greatest(p_response_ms, 0) end,
    case when p_response_ms is null then null else greatest(p_response_ms, 0) end,
    checked_at
  )
  on conflict (monitor_id, day) do update set
    check_count = public.uptime_daily.check_count + 1,
    success_count = public.uptime_daily.success_count + excluded.success_count,
    response_sample_count = public.uptime_daily.response_sample_count + excluded.response_sample_count,
    response_total_ms = public.uptime_daily.response_total_ms + excluded.response_total_ms,
    response_min_ms = case
      when public.uptime_daily.response_min_ms is null then excluded.response_min_ms
      when excluded.response_min_ms is null then public.uptime_daily.response_min_ms
      else least(public.uptime_daily.response_min_ms, excluded.response_min_ms)
    end,
    response_max_ms = case
      when public.uptime_daily.response_max_ms is null then excluded.response_max_ms
      when excluded.response_max_ms is null then public.uptime_daily.response_max_ms
      else greatest(public.uptime_daily.response_max_ms, excluded.response_max_ms)
    end,
    last_checked_at = excluded.last_checked_at;

  if next_state = 'down'::public.uptime_monitor_state
    and monitor.state is distinct from 'down'::public.uptime_monitor_state then
    insert into public.uptime_incidents (monitor_id, owner_id, detected_at, initial_error)
    values (
      monitor.id,
      monitor.owner_id,
      checked_at,
      coalesce(nullif(error_message, ''), 'Unexpected HTTP status ' || coalesce(p_status_code::text, 'unknown'))
    )
    on conflict (monitor_id) where recovered_at is null do nothing;
  elsif succeeded and monitor.state = 'down'::public.uptime_monitor_state then
    update public.uptime_incidents
    set recovered_at = checked_at,
        final_status_code = p_status_code::smallint
    where monitor_id = monitor.id
      and recovered_at is null;
  end if;
end;
$$;

revoke all on function public.record_uptime_check(uuid, integer, integer, text) from public;
grant execute on function public.record_uptime_check(uuid, integer, integer, text) to service_role;
