-- Row Level Security for every user-owned table.
--
-- Policies are written per-operation rather than as a single `for all` policy so
-- that intent is explicit and a mistake in one operation cannot silently widen
-- the others.
--
-- `(select auth.uid())` is deliberate: wrapping the call in a scalar subquery
-- lets Postgres evaluate it once per statement as an InitPlan instead of once
-- per row, which matters on the audits and issues tables.

alter table public.profiles enable row level security;
alter table public.websites enable row level security;
alter table public.audits enable row level security;
alter table public.issues enable row level security;
alter table public.report_preferences enable row level security;

-- Force RLS so that even a table owner connecting directly is subject to it.
alter table public.profiles force row level security;
alter table public.websites force row level security;
alter table public.audits force row level security;
alter table public.issues force row level security;
alter table public.report_preferences force row level security;

-- -------------------------------------------------------------------- profiles
-- No insert policy: rows are created by the `handle_new_user` trigger, which is
-- security definer. A client has no reason to insert a profile directly.
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- -------------------------------------------------------------------- websites
create policy "Users can read their own websites"
  on public.websites for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own websites"
  on public.websites for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own websites"
  on public.websites for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own websites"
  on public.websites for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------- audits
create policy "Users can read their own audits"
  on public.audits for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own audits"
  on public.audits for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own audits"
  on public.audits for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own audits"
  on public.audits for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------- issues
create policy "Users can read their own issues"
  on public.issues for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own issues"
  on public.issues for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own issues"
  on public.issues for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own issues"
  on public.issues for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------- report preferences
create policy "Users can read their own report preferences"
  on public.report_preferences for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own report preferences"
  on public.report_preferences for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own report preferences"
  on public.report_preferences for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own report preferences"
  on public.report_preferences for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- ------------------------------------------------------------------ privileges
-- RLS filters rows, but the role still needs table privileges to reach them.
-- `anon` is granted nothing: every table here is private to a signed-in user.
grant select, insert, update, delete on public.websites to authenticated;
grant select, insert, update, delete on public.audits to authenticated;
grant select, insert, update, delete on public.issues to authenticated;
grant select, insert, update, delete on public.report_preferences to authenticated;
grant select, update on public.profiles to authenticated;

revoke all on public.profiles from anon;
revoke all on public.websites from anon;
revoke all on public.audits from anon;
revoke all on public.issues from anon;
revoke all on public.report_preferences from anon;
