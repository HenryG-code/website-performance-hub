# PerformanceHub

[![PerformanceHub product preview](docs/images/performancehub-preview.png)](https://performancehub.weblytics.co.za)

> A private website-health workspace for owners and agencies.

PerformanceHub turns live Google PageSpeed Insights responses into an
actionable view of website performance, SEO, accessibility, best practices and
open findings - without inventing numbers to fill gaps.

[Open the live app](https://performancehub.weblytics.co.za) ·
[View the source](https://github.com/HenryG-code/website-performance-hub)

## Highlights

- **Live audit evidence** - every score, metric, finding and audit date comes
  from a stored Google PageSpeed Insights response.
- **Clear lab-versus-field reporting** - Lighthouse and Chrome UX Report data
  are presented separately, and the UI says when field data is unavailable.
- **Private by design** - Supabase Auth and Postgres Row Level Security keep
  every workspace isolated to its signed-in owner.
- **Practical audit workflow** - monitor websites, run desktop or mobile
  audits, prioritise findings and generate client-ready reports.
- **Production safeguards** - SSRF protection, rate limits, duplicate-run
  prevention, stale-result handling and typed database constraints.

There is intentionally **no synthetic uptime, availability or sample audit
data** presented as a real measurement. If Google does not provide a metric,
PerformanceHub makes that limitation visible.

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

| Variable | What it is | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project API URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable ("anon") key | Yes |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, used for Open Graph image URLs | Recommended |
| `PAGESPEED_API_KEY` | Google PageSpeed Insights API key | Yes, to run audits |

**Auth emails no longer depend on `NEXT_PUBLIC_SITE_URL`.** Confirmation and
password-reset links are built from the origin the request actually arrived on
(`src/lib/supabase/request-origin.ts`). A typo in the variable once pointed
every reset link at a domain that did not resolve, and the only people affected
were the ones who could not sign in to report it. The variable still sets
`metadataBase` for link previews, so it is worth getting right — but it can no
longer lock anyone out.

The Supabase anon key is safe in the browser: it grants no privileges of its
own, and every table is protected by RLS. **The service-role key is never used
by this application and must not be added** — it bypasses RLS entirely.

`PAGESPEED_API_KEY` has no `NEXT_PUBLIC_` prefix, so Next has no mechanism to
inline it into browser JavaScript. It is read only by
`src/lib/pagespeed/client.ts`, which is marked `server-only` — importing that
module from a client component is a build error.

### Getting a PageSpeed API key

1. Open the [Google Cloud console](https://console.cloud.google.com/) and create
   or select a project.
2. **APIs & Services → Library** → enable **PageSpeed Insights API**.
3. **APIs & Services → Credentials → Create credentials → API key**.
4. Restrict the key to the PageSpeed Insights API.

Without a key, the API permits only a small anonymous allowance shared across
every caller worldwide; in practice it returns HTTP 429 straight away. The app
detects a missing key and disables the audit button with an explanation rather
than failing at run time.

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

### Enable hourly uptime monitoring

Uptime is measured by a Supabase Edge Function, not inferred from a PageSpeed
audit. This keeps availability checks quick and lets the Vercel Hobby deployment
stay free of an hourly scheduler.

1. Deploy the included `uptime-check` Edge Function:

   ```bash
   npx supabase functions deploy uptime-check --project-ref tmvqfotyjedwluiszxiw
   ```
2. Create a long random `UPTIME_CRON_SECRET` in **Edge Functions → Secrets**.
3. In the SQL editor, store that exact same value in Vault and schedule the
   function (replace the placeholders):

```sql
select vault.create_secret('YOUR_RANDOM_SECRET', 'uptime_cron_secret');
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');

select cron.schedule(
  'performancehub-hourly-uptime',
  '5 * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/uptime-check',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey',
        (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key'),
        'x-uptime-cron-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'uptime_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $$
);
```

Store your project publishable key in Vault first:

```sql
select vault.create_secret('YOUR_SUPABASE_PUBLISHABLE_KEY', 'publishable_key');
```

Enable only the websites you want checked on the new **Uptime** page. Each
hourly sweep records a lightweight HTTP result. Two consecutive failures open a
confirmed outage; the next success closes it.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build (type-checked) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint across the project |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:live` | Live PageSpeed and DNS verification (uses local API key) |

---

## Where the data comes from

Every audit is one call to
`https://www.googleapis.com/pagespeedonline/v5/runPagespeed`, requesting all
four Lighthouse categories for a `mobile` or `desktop` strategy. The response is
stored verbatim in `audits.raw_response`, and everything shown is derived from
it.

### Lab vs. field

The two are shown side by side and never merged, because they measure different
things:

| | Lab (Lighthouse) | Field (CrUX) |
| --- | --- | --- |
| Source | One synthetic run on Google's hardware | Real Chrome users, trailing 28 days |
| Availability | Always | Only for sites with enough traffic |
| Used for | Category scores, TBT, Speed Index | Real-user LCP, INP, CLS |

INP has no lab equivalent — Lighthouse cannot measure real interactions — so it
shows as *Not measured* in the lab column rather than being substituted.

**When Google reports no field data**, the UI says so explicitly. Most small
sites fall into this category, which is normal and not an error.

### What is derived, and how

- **Category scores** are Lighthouse's own, multiplied by 100.
- **Severity** comes from Lighthouse's scoring bands (<0.5 failing, 0.5–0.89
  needs improvement), sharpened by the audit's weight in its category and any
  measured saving.
- **Score impact** is the audit's weighted shortfall: `weight ÷ category weight
  × (1 − score) × 100`. Since a category score is the weighted mean of its
  audits, this is exactly the points recoverable by fixing it.
- **Trends** are real completed audits grouped by day.

Nothing else is derived. In particular there is **no uptime monitoring** in this
product: earlier phases displayed a synthetic uptime figure, which has been
removed rather than left to look like a measurement.

### Quotas and rate limits

Google's default quota for a keyed project is **25,000 requests/day** and
**240 requests/minute**, and each run takes 10–60 seconds. On top of that the
app applies its own limits, in `src/lib/audit/limits.ts`:

| Limit | Value |
| --- | --- |
| Per user, per hour | 30 audits |
| Per user, per day | 200 audits |
| Same site + strategy cooldown | 60 seconds |
| Provider request timeout | 90 seconds |
| Abandoned run reclaimed after | 5 minutes |

Auditing several sites at once runs them **sequentially**, not in parallel — a
burst of concurrent requests is the fastest route to a 429.

Storage is the other cost worth knowing: a raw PageSpeed response is typically
300 KB–1 MB, so roughly 100 audits per 50 MB.

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
        ├── audits          (1:N)  provider, requested/final URL, strategy, timing,
        │                          four scores, lab vitals, CrUX field data,
        │                          Lighthouse version, raw response
        └── issues          (1:N)  rule id, severity, category, kind, status,
                                   display value, measured saving, flagged resources
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

Also worth knowing:

- **`provider` distinguishes measured from generated.** Rows created by the
  retired mock engine are labelled `simulated` and flagged wherever they appear.
  A completed `pagespeed` row is required by a check constraint to carry both a
  requested URL and a raw response, so a real audit cannot exist without its
  evidence.
- **Field columns are all-or-nothing.** A constraint enforces that field metrics
  are null unless `field_data_available` is true, so partial CrUX data cannot be
  mistaken for a complete reading.

---

## Auditing safely

The audit endpoint is authenticated, authorised and rate-limited, and the target
URL is validated before every run — not just when the website was added, because
DNS changes and a hostname that was public last week can point somewhere
internal today.

`src/lib/security/url-guard.ts` rejects:

- Anything that is not `http:` or `https:`
- URLs carrying credentials (`user:pass@host`)
- `localhost`, loopback, and internal suffixes (`.local`, `.internal`, `.corp`, …)
- RFC 1918 private ranges, link-local, CGNAT, benchmarking, multicast, broadcast
- IPv6 loopback, unique-local, link-local, and IPv4-mapped private addresses
- Cloud metadata endpoints, including `169.254.169.254` and
  `metadata.google.internal`
- Hostnames that *resolve* to any of the above — DNS rebinding is checked by
  looking up every returned address

**Redirects are checked too.** Google follows redirects during analysis, so the
`finalUrl` it reports is re-validated before the result is stored; a page that
redirects somewhere internal has its result discarded.

Authorisation is enforced at both ends: the action verifies the website belongs
to the caller, and RLS independently prevents reading or writing another user's
rows even if that check were bypassed.

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
│                               # settings, maintenance, legacy import
├── proxy.ts                    # Session refresh + route protection
├── components/                 # ui/ layout/ shared/ charts/ dashboard/ websites/
│                               # audits/ issues/ reports/ auth/ settings/ onboarding/
├── lib/
│   ├── pagespeed/              # PSI client, response mapper, types, fixtures
│   │   ├── client.ts           # server-only; holds the API key
│   │   └── map.ts              # Response -> scores, vitals, field data, findings
│   ├── security/url-guard.ts   # SSRF / private-address validation
│   ├── audit/limits.ts         # Rate limits, cooldown, staleness policy
│   ├── supabase/               # browser client, server client, session proxy, env
│   ├── data/                   # workspace query + row→domain mappers
│   ├── derive/trends.ts        # Trends from real audits
│   ├── store/                  # Client store over server data + server actions
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

## Retiring the simulated engine

The mock audit generator has been removed from the codebase entirely. There is
no demo-data seeder and no sample websites: an empty account stays empty until
you add a real site and audit it.

Rows created by the old engine were **not** deleted by the migration. They are
relabelled `provider = 'simulated'` and flagged wherever they appear, because
deleting a user's data as a silent side effect of a schema change is the wrong
default.

To remove them: **Settings → Simulated data → Review and remove**. The dialog
reports exactly how many audits and findings will go, names any website that
would be left with no history at all, and requires the count to be typed back
before the button enables. The server re-counts and refuses if the number has
changed since you looked. **Website records are never deleted.**

### Mock data that remains

Only `src/lib/pagespeed/__fixtures__/psi-response.ts` — trimmed PageSpeed
responses used by the mapper tests. It is imported by test files only and never
reaches a running application.

---

## Testing

```bash
npm test
```

188 tests across nine suites, none of which touch the network:

| Suite | Covers |
| --- | --- |
| `security/url-guard.test.ts` | Private ranges, loopback, metadata endpoints, schemes, credentials |
| `security/safe-redirect.test.ts` | Open-redirect defence, including protocol-relative and backslash bypasses |
| `pagespeed/map.test.ts` | Score conversion, lab metrics, CrUX scope and CLS rescaling, finding classification, severity, score-impact maths |
| `pagespeed/client.test.ts` | Request shape, key handling, every provider error path, timeout, key never leaking into messages |
| `audit/limits.test.ts` | Duplicate runs, cooldown, hourly and daily caps, precedence |
| `audit/reconcile.test.ts` | Triage preserved across re-runs, regressions reopened, disappeared findings resolved, nothing deleted |
| `data/mappers.test.ts` | Abandoned runs presented as failed, last-good scores retained after a failure, field data never borrowing from lab, 0ms treated as measured |
| `actions/audits.test.ts` | Authorisation, cross-account refusal, SSRF refusal, missing-key refusal |

### Live checks

```bash
npm run test:live
```

Kept separate because they call Google and real DNS, cost quota, and take a
couple of minutes. They catch what fixtures cannot — provider drift, and
whether the DNS resolution step in the SSRF guard actually runs:

- every category, metric and finding for weblytics.co.za, sinoplant.co.za and
  bwts.co.za on **both** mobile and desktop
- lab and field data staying separate, with no lab value substituted when
  Google reports no field data
- hostnames that resolve to loopback or private addresses being refused

The mapper tests assert on fixtures shaped exactly like real v5 payloads,
including the CrUX convention of sending CLS multiplied by 100 — a detail that
silently produces 100× wrong values if mishandled.

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

## Screenshots

The data-free product preview at the top of this README is committed. Signed-in
dashboard screenshots are not: they contain one account's private audit data,
and the reference sites may belong to real clients. Publishing those images in
a public repository would expose client performance information.

To generate a set locally:

```bash
npm run dev
```

Sign in, then capture at 1440×900 and 390×844:

| Screen | Path | Worth showing |
| --- | --- | --- |
| Dashboard | `/` | Health gauge, four category cards, real-user data, trend |
| Websites | `/websites` | Table and card views, filters |
| Website detail | `/websites/[id]` | Score history, lab vs field, findings by category |
| Audit detail | `/audits/[id]` | Provenance badges, Core Web Vitals, passed checks |
| Issues | `/issues` | Severity ordering, inline status |
| Sign in | `/sign-in` | Split layout, no session needed |

Redact the website names and URLs before publishing anything from a real
account.

---

## Brand and app identity

| Asset | Source | Serves at |
| --- | --- | --- |
| Favicon | `src/app/icon.svg` | `/icon.svg` |
| Apple touch icon | `src/app/apple-icon.tsx` | `/apple-icon` (180×180 PNG) |
| Link preview card | `src/app/opengraph-image.tsx` | `/opengraph-image` (1200×630 PNG) |
| Web manifest | `src/app/manifest.ts` | `/manifest.webmanifest` |

Icons and the preview card are **generated from the same brand tokens the app
uses**, not committed as binaries, so a colour change cannot leave a stale PNG
behind. The mark is an activity pulse on the blue-to-sky gradient, drawn on a
filled tile so it stays legible at 16px against light or dark browser chrome.

All four are public routes. They are fetched by clients that can never hold a
session — link unfurlers, iOS, the browser loading the manifest — so the auth
middleware allows them explicitly while everything else stays gated. There is a
test for that classification in both directions.

`robots` is `noindex, nofollow`: every page sits behind authentication and shows
one user's private data, so there is nothing worth indexing.

---

## Accessibility

- Skip-to-content link, landmark regions, `aria-current` on active nav items
- Visible `:focus-visible` ring that is never removed
- Labelled fields with inline, `role="alert"` errors
- Accessible names on every icon-only control
- Password fields have a labelled show/hide toggle and correct `autocomplete`
  values, so managers offer the right credential
- `prefers-reduced-motion` collapses animation to 1ms rather than removing it,
  because Radix waits for `animationend` before unmounting an overlay and
  `animation: none` would leave dialogs on screen
- Pinch-zoom is not capped (`maximumScale: 5`), which WCAG 1.4.4 requires

Text contrast is measured, not assumed. Every text node is checked against its
computed background — including raised surfaces, where a token can pass on the
page background and fail on a card. Both failures found this way (the primary
button at 3.68:1 and muted small print at 4.13:1) were fixed by moving the
token, not by patching one component.

---

## Production behaviour

**A run takes 10-60 seconds and holds the request open.** There is no job queue:
the server action calls Google, waits, stores the result, and only then
responds. The button says so before you click and while it waits. Auditing
several sites runs them one after another for the same reason.

**A failed run never destroys a good one.** Failures are stored as their own
audit row with a reason and error code. The website keeps showing the scores
from its last successful run, labelled as such, so nothing silently goes stale
or drops to zero.

**A crashed run cannot get stuck.** If the process handling a run dies, its row
would stay `running` forever. Three things prevent that mattering:

1. reads present a run older than the provider timeout as failed, so the UI
   never shows a spinner that cannot resolve;
2. the next run of that website reclaims the row before starting;
3. the audits list offers a manual "clear" for a workspace that is not about to
   run anything.

**Only one live run per website and strategy.** Enforced by a partial unique
index, not just an application check, so two browser tabs cannot both start one.

**Re-running preserves your triage.** Findings are reconciled, not replaced: a
rule that still fails keeps the status you gave it, one that stops being
reported is marked resolved, and a resolved rule that regresses reopens.
Findings are scoped to a strategy, so a desktop run never resolves a
mobile-only finding.

---

## Troubleshooting password reset

Reset emails have two moving parts, and only one of them lives in this repo.

**The link in the email** is built from the request origin, so it always points
at whichever domain the user was on. Nothing to configure.

**Supabase must allow that destination.** It refuses any `redirect_to` that is
not on the project's allow-list and silently falls back to the Site URL
instead — the user lands on `/` rather than `/reset-password`. In
**Authentication → URL Configuration** set:

- **Site URL:** `https://performancehub.weblytics.co.za`
- **Redirect URLs:** `https://performancehub.weblytics.co.za/**`

The wildcard also covers preview deployments if you add
`https://*-your-team.vercel.app/**`.

| Symptom | Cause |
| --- | --- |
| No email arrives at all | Supabase's built-in mailer is capped at a few messages per hour. Check **Authentication → Logs** for a `/recover` request; if it is there, the send was rate-limited or went to spam |
| Link lands on `/` instead of the reset form | `redirect_to` is not on the allow-list, so Supabase fell back to the Site URL |
| Link opens "This link has expired" | Reset links are single-use and expire after an hour |
| Link goes to a domain that does not load | Pre-fix behaviour; resolved by deriving the origin from the request |

For real volume, replace the built-in mailer with SMTP under
**Authentication → Emails**. Resend's free tier (3,000/month) is enough, and
verifying the sending domain fixes spam placement.

---

## Troubleshooting PageSpeed errors

| What you see | What it means | What to do |
| --- | --- | --- |
| *Audits not configured* | `PAGESPEED_API_KEY` is unset | Add it to `.env.local` and restart the dev server |
| *The PageSpeed API key was rejected* | Key is wrong, or the PageSpeed Insights API is not enabled on the project | Re-check the key; enable the API under **APIs & Services → Library** |
| *The daily PageSpeed quota has been used up* | Project quota exhausted | Wait for the reset (midnight Pacific), or raise the quota in Google Cloud |
| *PageSpeed rate limit reached* | Too many requests too quickly | Wait a minute. Auditing many sites already runs sequentially |
| *Google could not load that URL* | The page returned an error, blocked the crawler, or is not publicly reachable | Open the URL in a private window; check for bot protection or auth walls |
| *Lighthouse could not analyse the page* | The page loaded but Lighthouse aborted | Usually a redirect loop or a very slow origin. Retry once |
| *The audit took longer than 90s* | Provider timeout | Retry. Persistently slow origins may never complete |
| *This website was audited moments ago* | 60-second per-site cooldown | Wait; results barely move minute to minute |
| *An audit is already running…* | A run is in flight for this site and strategy | Wait for it, or clear an abandoned run from the audits list |
| *That URL redirected to a private address* | The site redirects somewhere internal | Expected for staging behind a VPN; not auditable |
| *The audit did not finish* | The process handling the run died | Run it again |

Errors shown to users never contain the API key, raw provider payloads, or
server internals — provider messages are translated, and the mapping is
covered by tests.

---

## Known limitations

- **Audits run inline.** A run holds the request open for its full 10–60s.
  That is fine at this scale and makes the stored result terminal, but it caps
  how many sites can be audited in one action before a platform request timeout
  becomes a concern. A queue with webhook completion is the next step.
- **No scheduled audits.** `audit_frequency` is stored and shown in Settings but
  nothing acts on it yet; every run is manual.
- **One probe region.** Uptime reflects reachability from the Supabase worker,
  not a multi-region SLA. An outage is confirmed after two consecutive hourly
  failures, so durations are estimated between checks.
- **Findings carry no separate recommendation.** Lighthouse folds its guidance
  into the audit description, which is stored and displayed verbatim; the
  `recommendation` column is left empty rather than paraphrasing advice Google
  did not give.
- **`effort` is legacy.** It came from the mock catalogue and is no longer
  displayed. Lighthouse's measured saving is shown instead.
- **Insight audits report zero score impact.** Lighthouse 13's `*-insight`
  audits carry weight 0 in their category — they are advisory overlays on the
  metrics that *are* weighted — so their computed score impact is 0 even when
  they report a large time saving. Lists are ordered by severity rather than
  score impact so these still surface near the top, but the "points if fixed"
  figure understates them.

## Future integration plan

**Next — scale and scheduling.** Move audit execution to a queue with webhook
completion, and drive scheduled runs from the stored `audit_frequency`.

**Then — delivery.** Email, Slack and webhook delivery behind the existing
notification preferences; PDF and CSV report export.

**Later — collaboration.** Teams and shared workspaces, which is where the
single-owner RLS model becomes membership-based. Public report links. Billing.

None of these are in this phase.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase
(Auth + Postgres) · Radix UI primitives · Recharts · Lucide icons · Zod
