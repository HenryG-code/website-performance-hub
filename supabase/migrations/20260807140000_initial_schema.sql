-- PerformanceHub — core schema
--
-- Every user-owned row carries `owner_id`. Ownership is enforced twice: by RLS
-- (so a user can only ever see their own rows) and by composite foreign keys
-- (so a child row can never point at a parent belonging to someone else, even
-- if application code gets it wrong).

-- ---------------------------------------------------------------- enumerations
create type public.website_status as enum ('operational', 'degraded', 'down', 'paused');
create type public.environment_type as enum ('production', 'staging');
create type public.audit_status as enum ('queued', 'running', 'completed', 'failed');
create type public.audit_trigger as enum ('scheduled', 'manual');
create type public.device_type as enum ('desktop', 'mobile');
create type public.issue_severity as enum ('critical', 'high', 'medium', 'low');
create type public.issue_status as enum ('open', 'in_progress', 'resolved', 'ignored');
create type public.issue_category as enum ('performance', 'seo', 'accessibility', 'best-practices', 'security');
create type public.effort_level as enum ('low', 'medium', 'high');
create type public.audit_frequency as enum ('hourly', 'daily', 'weekly');

-- --------------------------------------------------------------- shared helper
-- Keeps `updated_at` honest without the application having to remember.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  role text not null default '' check (char_length(role) <= 60),
  company text not null default '' check (char_length(company) <= 80),
  timezone text not null default 'UTC' check (char_length(timezone) <= 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user, created automatically on sign-up.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------- websites
create table public.websites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 60),
  url text not null check (url ~* '^https?://[a-z0-9-]+(\.[a-z0-9-]+)+(/.*)?$'),
  status public.website_status not null default 'paused',
  environment public.environment_type not null default 'production',
  team text not null default 'Unassigned' check (char_length(team) <= 40),
  tags text[] not null default '{}' check (cardinality(tags) <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A user cannot monitor the same address twice; two different users can.
  constraint websites_owner_url_key unique (owner_id, url),
  -- Target for the composite foreign keys on audits and issues.
  constraint websites_id_owner_key unique (id, owner_id)
);

comment on column public.websites.status is
  'paused = added but never audited; set to operational once a run completes.';

create index websites_owner_created_idx on public.websites (owner_id, created_at desc);

create trigger websites_set_updated_at
  before update on public.websites
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------- audits
create table public.audits (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null,
  owner_id uuid not null references auth.users (id) on delete cascade,

  status public.audit_status not null default 'queued',
  trigger public.audit_trigger not null default 'manual',
  device public.device_type not null default 'desktop',

  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer not null default 0 check (duration_ms >= 0),

  -- Scores are null until the run completes; a failed run never gets any.
  performance_score smallint check (performance_score between 0 and 100),
  seo_score smallint check (seo_score between 0 and 100),
  accessibility_score smallint check (accessibility_score between 0 and 100),
  best_practices_score smallint check (best_practices_score between 0 and 100),
  health_score smallint check (health_score between 0 and 100),

  -- Lab metrics. Seconds for lcp/fcp/speed_index, milliseconds for inp/ttfb/tbt.
  lcp numeric(6, 2) check (lcp >= 0),
  fcp numeric(6, 2) check (fcp >= 0),
  cls numeric(6, 3) check (cls >= 0),
  inp integer check (inp >= 0),
  ttfb integer check (ttfb >= 0),
  tbt integer check (tbt >= 0),
  speed_index numeric(6, 2) check (speed_index >= 0),

  passed_checks smallint not null default 0 check (passed_checks >= 0),
  total_checks smallint not null default 0 check (total_checks >= 0),
  issues_found smallint not null default 0 check (issues_found >= 0),
  failure_reason text check (char_length(failure_reason) <= 500),

  created_at timestamptz not null default now(),

  -- An audit can only ever belong to a website the same user owns.
  constraint audits_website_owner_fkey
    foreign key (website_id, owner_id)
    references public.websites (id, owner_id) on delete cascade,

  -- Target for the composite foreign key on issues.
  constraint audits_id_owner_key unique (id, owner_id),

  constraint audits_passed_within_total check (passed_checks <= total_checks),

  -- A completed run must carry a full set of scores; anything else must not.
  constraint audits_completed_has_scores check (
    (status = 'completed') = (
      performance_score is not null
      and seo_score is not null
      and accessibility_score is not null
      and best_practices_score is not null
      and health_score is not null
    )
  ),

  constraint audits_completed_has_timestamp check (
    (status = 'completed') = (completed_at is not null)
  )
);

create index audits_owner_started_idx on public.audits (owner_id, started_at desc);
create index audits_website_started_idx on public.audits (website_id, started_at desc);
create index audits_owner_status_idx on public.audits (owner_id, status);

-- ---------------------------------------------------------------------- issues
create table public.issues (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null,
  audit_id uuid,
  owner_id uuid not null references auth.users (id) on delete cascade,

  -- Underlying audit rule, e.g. `color-contrast`. Not unique: the same rule can
  -- legitimately fire on several websites.
  rule_id text not null check (char_length(rule_id) between 1 and 100),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  recommendation text not null default '' check (char_length(recommendation) <= 2000),

  severity public.issue_severity not null,
  category public.issue_category not null,
  status public.issue_status not null default 'open',

  score_impact smallint not null default 0 check (score_impact between 0 and 100),
  effort public.effort_level not null default 'medium',
  affected_pages text[] not null default '{}' check (cardinality(affected_pages) <= 25),

  found_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint issues_website_owner_fkey
    foreign key (website_id, owner_id)
    references public.websites (id, owner_id) on delete cascade,

  -- Keeping the issue when its audit is deleted preserves remediation history.
  constraint issues_audit_owner_fkey
    foreign key (audit_id, owner_id)
    references public.audits (id, owner_id) on delete set null
);

create index issues_owner_status_idx on public.issues (owner_id, status);
create index issues_website_idx on public.issues (website_id);
create index issues_audit_idx on public.issues (audit_id);
create index issues_owner_severity_idx on public.issues (owner_id, severity);

create trigger issues_set_updated_at
  before update on public.issues
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------- report preferences
create table public.report_preferences (
  owner_id uuid primary key references auth.users (id) on delete cascade,

  report_title text not null default 'Website performance report'
    check (char_length(btrim(report_title)) between 1 and 120),
  brand_name text not null default '' check (char_length(brand_name) <= 80),

  notify_audit_completed boolean not null default true,
  notify_critical_issues boolean not null default true,
  notify_uptime_incidents boolean not null default true,
  notify_score_drops boolean not null default false,
  notify_weekly_digest boolean not null default true,
  notify_product_updates boolean not null default false,

  audit_frequency public.audit_frequency not null default 'daily',
  default_device public.device_type not null default 'desktop',
  score_threshold smallint not null default 70 check (score_threshold between 0 and 100),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger report_preferences_set_updated_at
  before update on public.report_preferences
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------- new-user wiring
-- Every new auth user gets a profile and a preferences row, so the app never
-- has to cope with a signed-in user that has neither.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), '')
  )
  on conflict (id) do nothing;

  insert into public.report_preferences (owner_id)
  values (new.id)
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
