# PerformanceHub

A website-health dashboard for owners and agencies. PerformanceHub brings
performance, SEO, accessibility, best-practice, uptime and issue-tracking data
for every site you manage into one place.

**Phase 2: a secure, persistent, multi-user product.** Users sign up, sign in
and see only their own websites, audits, issues and settings — enforced by
Postgres Row Level Security, not just by application code.

Audit *execution* is still simulated (no page is actually fetched), but every
result it produces is written to Postgres and survives reloads and devices.

---

## Getting started

Requires Node.js 20 or newer and a Supabase project.

### 1. Install

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in from **Supabase dashboard → Project Settings → API**:

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable ("anon") key |
| `NEXT_PUBLIC_SITE_URL` | Origin used in confirmation and reset emails |

The anon key is safe in the browser: it grants no privileges of its own, and
every table is protected by RLS. **The service-role key is never used by this
application and must not be added** — it bypasses RLS entirely.

### 3. Apply migrations

Migrations live in `supabase/migrations/` and are applied in filename order.

With the Supabase CLI:

```bash
npx supabase link --project-ref <your-project-ref>
```

```bash
npx supabase db push
```

Or paste each file into the dashboard SQL editor, oldest first.

### 4. Configure auth redirects

In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback`
(and your deployed equivalent) to the allowed redirect URLs. Confirmation and
password-reset links both land there.

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>, create an account, and add your first website.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build (type-checked) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint across the project |
| `npm run typecheck` | `tsc --noEmit` |

---

## Authentication

Email and password, via Supabase Auth.

| Flow | Route | Notes |
| --- | --- | --- |
| Sign up | `/sign-up` | Creates the user; a trigger seeds their profile and preferences |
| Confirm email | `/auth/callback` → `/` | Handles both PKCE `code` and `token_hash` links |
| Sign in | `/sign-in` | Supports `?next=` to return to the page you were headed for |
| Forgot password | `/forgot-password` | Always reports success, so it can't enumerate accounts |
| Reset password | `/reset-password` | Recovery link signs you in, then you choose a new password |
| Sign out | Account menu | Server action; returns you to `/sign-in` |

### How routes are protected

Two independent layers:

1. **`src/proxy.ts`** runs on every non-asset request. It refreshes the session
   and redirects unauthenticated traffic to `/sign-in`, preserving the intended
   destination.
2. **`src/app/(app)/layout.tsx`** re-checks the user before rendering anything
   private. This is not redundant — a misconfigured matcher or a rewrite can
   skip middleware, and the layout that actually renders your data should not
   take that on trust.

Both use `supabase.auth.getUser()`, never `getSession()`. `getSession()` reads
the JWT straight out of the cookie without verifying it, so a forged cookie
would look like a valid session. `getUser()` revalidates with the auth server.

Redirect targets from `?next=` are checked to be same-origin absolute paths, so
the parameter can't be used to bounce a freshly authenticated user off-site.

---

## Data model

Five tables, all owned by a user and all under RLS.

```
auth.users
  ├── profiles              (1:1)  full name, role, company, timezone
  ├── report_preferences    (1:1)  report title, brand, notification toggles, audit defaults
  └── websites              (1:N)  name, url, status, environment, team, tags
        ├── audits          (1:N)  status, timing, four scores, health, Core Web Vitals
        └── issues          (1:N)  severity, category, status, recommendation, affected pages
```

Details worth knowing:

- **Ownership is enforced twice.** Every child table carries `owner_id` *and* a
  composite foreign key — `audits(website_id, owner_id) → websites(id, owner_id)`.
  So an audit can never point at a website belonging to someone else, even if
  application code gets it wrong. `issues` does the same against both parents.
- **Scores are nullable, with a check constraint.** A queued, running or failed
  audit has no scores; a completed one must have all five. The constraint is
  `(status = 'completed') = (scores are not null)`, so neither state can drift.
- **A website's headline score isn't stored.** It's read from that site's most
  recent completed audit, so the two can't disagree.
- **`updated_at` is maintained by a trigger**, not by application code.
- **Signing up creates the dependent rows.** `handle_new_user()` inserts the
  profile and preferences, so the app never meets a user with neither.

Enums (`website_status`, `audit_status`, `issue_severity`, …) generate exact
TypeScript union types rather than bare strings — see `src/types/database.ts`.

### Derived, not stored

- **Trends** come from real audits, grouped by day. A new account has an empty
  chart that fills in as audits accumulate — sparse and honest, rather than a
  smooth line implying data that was never collected.
- **Uptime** is derived deterministically from the website id. There is no
  uptime prober in this phase, so there is no measured availability to store;
  writing invented rows into the database would dress fiction up as fact. It's
  stable per site, and `src/lib/derive/uptime.ts` is the single seam to replace
  when real monitoring lands.

---

## Security model

**Row Level Security is enabled and `FORCE`d on all five tables**, so even a
table owner connecting directly is subject to it. Policies are written per
operation (select / insert / update / delete) rather than as one `FOR ALL`
policy, so a mistake in one can't silently widen the others.

Every policy is the same shape:

```sql
using ((select auth.uid()) = owner_id)
```

`auth.uid()` is wrapped in a scalar subquery deliberately: Postgres then
evaluates it once per statement as an InitPlan rather than once per row, which
matters on `audits` and `issues`.

The `anon` role is granted **nothing** on these tables — every one is private to
a signed-in user.

### Verified

Run inside a rolled-back transaction against the live database, acting as a
user id that owns nothing:

| Check | Result |
| --- | --- |
| Read another user's websites / audits / issues / profiles / preferences | 0 rows |
| Update another user's websites | 0 rows affected |
| Delete another user's issues | 0 rows affected |
| Insert a row owned by another user | blocked by `WITH CHECK` |
| `anon` privileges on all five tables | none |
| RLS enabled + forced on all five tables | yes |

### Input validation

Three layers, each doing a different job:

1. **Client** — `src/lib/validation.ts` schemas run in the form for instant feedback.
2. **Server** — the same schemas re-run inside every server action. Forms can be
   bypassed; this is the layer that actually protects the database.
3. **Database** — `CHECK` constraints on lengths, ranges and the URL format.

The phase-1 localStorage import is validated especially strictly, since its
payload is attacker-controlled by definition.

---

## Project structure

```
src/
├── app/
│   ├── layout.tsx              # Document shell + toast/tooltip providers
│   ├── (auth)/                 # Sign in, sign up, forgot/reset password, check email
│   ├── (app)/                  # Everything private; layout gates on the user
│   │   ├── layout.tsx          # Auth check + workspace load + AppShell
│   │   ├── page.tsx            # Dashboard
│   │   ├── websites/[id]/ audits/[id]/ issues/ reports/ settings/
│   ├── auth/callback/route.ts  # Email link handler (PKCE code + token_hash)
│   └── actions/                # Server actions: auth, websites, audits, issues,
│                               # settings, dev seed, legacy import
├── proxy.ts                    # Session refresh + route protection
├── components/                 # ui/ layout/ shared/ charts/ dashboard/
│                               # websites/ audits/ issues/ reports/ auth/ onboarding/
├── lib/
│   ├── supabase/               # browser client, server client, session middleware, env
│   ├── data/                   # workspace query + row→domain mappers
│   ├── derive/                 # trends from audits, simulated uptime
│   ├── audit/simulate.ts       # Audit simulation (server-side)
│   ├── store/                  # Client store over server data + server actions
│   ├── mock/                   # Seeded generator, used only by the dev seed
│   └── validation.ts           # Shared zod schemas
├── types/
│   ├── index.ts                # Domain types
│   └── database.ts             # Generated from the Supabase schema
└── supabase/migrations/        # Version-controlled SQL
```

### How data flows

`(app)/layout.tsx` loads the whole workspace server-side and hands it to a
client store. Every phase-1 component still reads `useAppStore()` exactly as
before — the mapping layer converts snake_case rows into the camelCase domain
objects the UI was built against, so no chart, table or card had to change.

Mutations go through server actions, which validate, write, and
`revalidatePath`. Issue-status edits apply optimistically so the control doesn't
snap back during the round-trip, and roll back if the server rejects them.

---

## Development data

**New accounts start empty**, with onboarding empty states throughout.

**Demo data (development only).** Account menu → *Load demo data*, or Settings →
Workspace data. It writes eight sample websites with ~100 audits and ~78
findings under your own `owner_id`. The server action refuses outright when
`NODE_ENV === "production"` — the guard is on the server, not just hidden in the
UI, because a server action is a public endpoint.

**Phase-1 localStorage data.** If the browser still holds a `performancehub:state`
payload from phase 1, a banner offers to import or discard it. It never imports
automatically: that data belongs to whoever used the browser last, and silently
attaching it to whichever account signs in next would be wrong. Nothing is
deleted until you choose.

---

## Recommended project settings

Two things worth enabling in the Supabase dashboard — both are configuration,
not code:

- **Leaked password protection** (Authentication → Policies). Checks new
  passwords against HaveIBeenPwned. Currently off.
- **Custom SMTP** (Project Settings → Auth). The built-in email service is
  rate-limited to a couple of messages per hour, which is fine for development
  but will block real sign-ups.

---

## Accessibility

- Skip-to-content link, landmark regions, `aria-current` on active nav items
- Visible `:focus-visible` ring that is never removed
- Labelled fields with inline, `role="alert"` errors
- Accessible names on every icon-only control
- Password fields have a labelled show/hide toggle and correct `autocomplete`
  values, so managers offer the right credential

---

## Future integration plan

**Phase 3 — real audits.** Replace `src/lib/audit/simulate.ts` with a PageSpeed
Insights / Lighthouse CI client. `Audit`, `Scores` and `WebVitals` already match
those payloads. Move execution to a queue-backed job and resolve runs from a
webhook rather than a client-side timer.

**Phase 4 — monitoring and delivery.** A real uptime prober replacing
`lib/derive/uptime.ts` with an `uptime_checks` table; scheduled audits driven by
the stored `audit_frequency`; the notification service behind the existing
preference toggles; PDF and CSV report export.

**Phase 5 — collaboration.** Teams and shared workspaces, which is where the
single-owner RLS model becomes membership-based. Public report links. Billing.

None of these are in this phase.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase
(Auth + Postgres) · Radix UI primitives · Recharts · Lucide icons · Zod
