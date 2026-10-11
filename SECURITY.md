# Security

Report vulnerabilities privately through [GitHub's vulnerability reporting form](https://github.com/HenryG-code/website-performance-hub/security/advisories/new). Do not post credentials or exploit details in a public issue.

## Deployment safeguards

- Never commit `.env.local`, Supabase service-role keys, cron secrets, or provider credentials. Only the Supabase project URL and publishable/anon key belong in `NEXT_PUBLIC_*` variables. Database row-level security remains essential for those public keys.
- Auth links use exact trusted origins: the production domain, `NEXT_PUBLIC_SITE_URL`, Vercel's server-provided deployment domains, and optional server-only `AUTH_ALLOWED_ORIGINS`. Add extra domains to Supabase's redirect allowlist as well. Forwarded headers cannot introduce a new trusted host or downgrade HTTPS.
- Uptime checks revalidate stored targets on every probe, reject private/special-use addresses and non-web ports, pin the validated destination IP, retain TLS certificate verification, and do not follow redirects. These controls must remain in the worker even when the application validates website changes.
- Deploy changes under `supabase/functions/` separately from Vercel: `npx supabase functions deploy uptime-check --project-ref tmvqfotyjedwluiszxiw --use-api`. The worker authenticates its scheduler with `UPTIME_CRON_SECRET`; `verify_jwt = false` is configured only for this secret-authenticated function.
- Security response headers block framing, plug-ins and off-site forms, disable MIME sniffing, and avoid leaking auth-link query strings through referrers. The CSP permits inline Next.js scripts/styles for compatibility; it is defense in depth, not a substitute for safe rendering.

## Verification

Run `npm ci --ignore-scripts`, `npm audit`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npx deno@2.9.6 check supabase/functions/uptime-check/index.ts` before publishing changes. GitHub Actions runs these checks without production credentials. Dependency alerts and CodeQL provide ongoing detection; a clean scan is not a guarantee that all vulnerabilities are absent.

React, TypeScript, hooks, and accessibility lint checks are configured directly. The Next.js ESLint preset was removed because it pulled in an unpatched vulnerable development-only dependency; keep the replacement plugins updated.

## Supabase advisor recommendations

The `rls_auto_enable()` internal event-trigger helper, when present, must not be executable by `PUBLIC`, `anon`, or `authenticated`. The guarded migration restricts those grants without removing the `ensure_rls` trigger or changing application data.

Two hosting recommendations require a separate operational decision:

- Leaked-password protection is a Supabase Pro-or-higher feature. The current Free project cannot enable it without upgrading. No plan upgrade is performed by these repository changes.
- `pg_net` powers monitoring and registers in the public schema, but its objects live in the unexposed `net` schema. Keep `net` out of the Data API's exposed schemas. Relocation requires dropping and re-creating the non-relocatable extension; this deletes queued requests and stored HTTP responses and can interrupt webhooks/monitoring. Back up required responses and confirm the queue is empty before an approved maintenance migration. Do not use `DROP ... CASCADE` to clear this warning.

References: [Supabase password security](https://supabase.com/docs/guides/auth/password-security), [pg_net troubleshooting and permissions](https://supabase.com/docs/guides/database/extensions/pg_net).
