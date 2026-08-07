# PerformanceHub

A website-health dashboard for owners and agencies. PerformanceHub brings
performance, SEO, accessibility, best-practice, uptime and issue-tracking data
for every site you manage into one place.

**This is phase 1: a complete, working application shell backed entirely by
local mock data.** There are no external API calls and no credentials — clone,
install, run.

---

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:3000>.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on port 3000 |
| `npm run build` | Production build (type-checked) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint across the project |
| `npm run typecheck` | `tsc --noEmit` |

---

## What's in it

### Dashboard (`/`)

- Overall health score as a gauge, with its 30-day change
- Four category cards — Performance, SEO, Accessibility, Best Practices — each
  with score, delta, sparkline and open-finding count
- Uptime card with a 30-day per-day availability strip
- Open-issue summary broken down by severity
- Score trend chart with 7/30/90-day ranges and a health/categories toggle
- Recent audits and priority issues lists
- Website selector that scopes every card on the page
- **Run audit** button that simulates a real run: an audit appears as `running`,
  resolves after a couple of seconds with new scores and lab metrics, appends a
  trend point, and may open a new finding

### Websites (`/websites`)

- Table and card views of every monitored site
- URL, health score, 30-day sparkline, uptime, open-issue count, last audit and
  status
- Search across name, URL, team and tags; filters for environment, status and
  health band; five sort orders
- **Add website** modal with live validation (required fields, domain format,
  duplicate detection) and an option to run the first audit immediately

### Website detail (`/websites/[id]`)

- Identity header with status, team, environment, tags and monitoring start date
- Overview metrics: health, uptime, average response time, open issues, last audit
- Category score cards and a score-history chart
- Daily availability chart
- Tabbed findings for Performance, SEO, Accessibility and Best Practices — each
  with the category score, open findings, passed checks, and (for performance)
  the Core Web Vitals from the latest run
- Recent audits and top issues for the site
- Remove website, with a confirmation dialog

### Audits (`/audits`)

- Full run history with status, website, start time, health score, per-category
  scores, duration and findings count
- Filters for website, status and device, plus free-text search
- Summary tiles for runs in view, average health, average duration and failures
- Paginated with a "load more" control

### Audit detail (`/audits/[id]`)

- Health gauge compared against the previous run on the same site
- Per-category scores with deltas
- Duration, checks passed, new findings, device profile
- Core Web Vitals grid (LCP, INP, CLS, FCP, TTFB, TBT, Speed Index) colour-coded
  against the published thresholds
- Findings opened by the run, and a sample of passed checks
- Dedicated states for `running`, `queued` and `failed` runs

### Issues (`/issues`)

- Table of every finding: severity, title, rule ID, category, website, status
  and date found
- Filters for severity, category, website and status, plus search
- Inline status control on every row
- Detail drawer with description, recommended fix, affected pages, score impact,
  effort, originating audit, and status controls
- Status changes (Open / In Progress / Resolved / Ignored) persist locally

### Reports (`/reports`)

- Client-ready report document: executive summary, score summary table with
  period-over-period change, trend chart, improvements and regressions,
  per-website breakdown, and ranked priority issues with recommendations
- Scope by website and period (7 / 30 / 90 days)
- Export menu (PDF / CSV / share link) — currently reports "coming soon", since
  generation lands with the reporting service in a later phase

### Settings (`/settings`)

- Profile: name, email, role, organisation, timezone — validated on save
- Notification preferences: six toggles, saved immediately
- Audit defaults: frequency, device profile, health alert threshold
- Workspace data: explains local persistence and offers a reset to the seeded
  dataset

---

## Project structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout, metadata, providers, app shell
│   ├── providers.tsx           # Store + toast + tooltip providers
│   ├── globals.css             # Design tokens, base layer, animations
│   ├── page.tsx                # Dashboard
│   ├── error.tsx               # Route error boundary
│   ├── not-found.tsx           # 404
│   ├── loading.tsx             # Per-route loading skeletons (one per segment)
│   ├── websites/[id]/
│   ├── audits/[id]/
│   ├── issues/
│   ├── reports/
│   └── settings/
├── components/
│   ├── ui/                     # Primitives: button, card, badge, input, select,
│   │                           # dialog, sheet, dropdown, switch, tabs, table,
│   │                           # tooltip, progress, skeleton, toast
│   ├── layout/                 # Sidebar, mobile nav + tab bar, top bar,
│   │                           # global search, notifications, user menu
│   ├── shared/                 # Cross-feature: page header, empty state, badges,
│   │                           # score ring, delta, stat tile, filters, avatar
│   ├── charts/                 # Recharts wrappers + shared chart theme
│   ├── dashboard/              # Overview cards, score cards, trend card, panels,
│   │                           # website selector, run-audit button
│   ├── websites/               # Table/cards, add-website dialog, category findings
│   ├── audits/                 # Audit table, audit list row, vitals grid
│   ├── issues/                 # Issue table, list row, detail drawer
│   └── reports/                # Report document
├── lib/
│   ├── constants.ts            # Reference clock, storage key, score weights
│   ├── format.ts               # SSR-safe date/number formatting
│   ├── scores.ts               # Score maths, bands, labels, colours
│   ├── navigation.ts           # Nav config and active-path helpers
│   ├── utils.ts                # `cn` class merger
│   ├── mock/
│   │   ├── random.ts           # Seeded PRNG
│   │   ├── catalog.ts          # 32 realistic audit findings + passed checks
│   │   └── generate.ts         # Deterministic dataset builder
│   └── store/
│       ├── app-store.tsx       # React context, localStorage persistence
│       ├── reducer.ts          # All state transitions
│       └── selectors.ts        # Derived data (summaries, trends, breakdowns)
└── types/
    └── index.ts                # Domain model
```

---

## How the mock data works

Two decisions shape the data layer, and both matter if you extend it:

**Everything is deterministic.** The dataset is built by a seeded PRNG
(`lib/mock/random.ts`) from a fixed reference clock (`REFERENCE_NOW` in
`lib/constants.ts`). The server render and the first client render therefore
produce byte-identical output — no hydration mismatches from `Math.random()` or
`Date.now()`. Date formatting uses UTC getters rather than `toLocaleString` for
the same reason.

**State lives in one client store.** `AppStoreProvider` seeds from
`createSeedState()`, then hydrates from `localStorage` in an effect and writes
back on every change. Reducer actions cover adding and removing websites,
starting and completing audits, changing issue status, and updating settings.

The seeded dataset contains 8 websites across production and staging, ~100
audits spanning 90 days (including failed, running and queued runs), ~78 findings
drawn from a catalogue of realistic Lighthouse/axe-style rules, 90 days of daily
score history per site, and 30 days of uptime.

Clearing the workspace data (Settings → Reset demo data, or the account menu)
restores the seed.

---

## Design

A single dark navy theme, executed properly rather than a half-finished
light/dark pair. All tokens live in `@theme` at the top of `globals.css`:

- **Surfaces** — `background` → `surface` → `card` → `elevated` → `hover`
- **Interactive** — blue `primary`, sky `accent`
- **Health status** — green (good, 90+), amber (needs work, 60–89), red (poor,
  below 60), used identically by badges, gauges, progress bars and charts

Charts mirror the same values in `components/charts/chart-theme.ts`, because
Recharts renders inline SVG rather than utility classes.

Responsiveness: fixed sidebar from `lg`, a slide-in drawer below it, and a
bottom tab bar on phones. Wide tables scroll inside their own container so the
page body never scrolls sideways. Every list, table and chart has a purpose-written
empty state, and each route segment has a skeleton that mirrors its real layout.

---

## Accessibility

- Skip-to-content link, landmark regions, and `aria-current` on active nav items
- Visible `:focus-visible` ring that is never removed
- Labelled form fields with inline, `role="alert"` errors
- Accessible names on every icon-only control
- Charts have text equivalents nearby; gauges expose an `aria-label` with the
  score and its rating

---

## Future integration plan

Phase 1 deliberately keeps every I/O boundary in one place, so later phases
replace the data layer without touching the UI.

**Phase 2 — real audits.** Swap `lib/mock/generate.ts` for a PageSpeed
Insights / Lighthouse CI client. `Audit`, `Scores` and `WebVitals` already match
the shape those APIs return. Run audits in a queue-backed job rather than a
`setTimeout`, and have the client poll or subscribe for completion.

**Phase 3 — persistence and accounts.** Move `PersistedState` into Postgres
(websites, audits, issues, trend points, uptime days map cleanly to tables).
Replace the reducer's local dispatches with server actions, add authentication,
and scope every query to an organisation. The user menu and settings page are
already laid out for real accounts.

**Phase 4 — monitoring and delivery.** Add a real uptime prober feeding
`UptimeDay`, scheduled audits driven by the `auditFrequency` setting, and the
notification service behind the existing preference toggles (email, Slack,
webhooks). Wire the report export menu to a PDF renderer and a CSV endpoint.

**Phase 5 — depth.** Historical page-level breakdowns, competitor benchmarking,
CI integration that fails builds on score regressions, and shareable public
report links.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Radix UI
primitives · Recharts · Lucide icons
