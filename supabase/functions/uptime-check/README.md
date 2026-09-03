# uptime-check

The Supabase Cron job invokes this Edge Function once per hour. It claims due
monitors atomically, sends a lightweight HTTP request to each target, and calls
the database function that stores the compact current state, daily roll-up and
incident transitions.

Before scheduling it, set `UPTIME_CRON_SECRET` as an Edge Function secret and
store the same value in Supabase Vault as `uptime_cron_secret`. The production
SQL setup command is included in the repository README.
