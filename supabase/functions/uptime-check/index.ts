import { checkTarget } from "../_shared/http-probe.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.2";

type DueMonitor = {
  monitor_id: string;
  target_url: string;
  timeout_ms: number;
  expected_status_min: number;
  expected_status_max: number;
};

const MAX_MONITORS_PER_RUN = 25;

Deno.serve(async (request) => {
  const secret = Deno.env.get("UPTIME_CRON_SECRET");
  if (!secret || request.headers.get("x-uptime-cron-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    (secretKeys ? JSON.parse(secretKeys).default : undefined);
  if (!url || !serviceRoleKey) {
    return Response.json({ error: "Missing Supabase function configuration." }, { status: 500 });
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.rpc("claim_due_uptime_monitors", {
    p_limit: MAX_MONITORS_PER_RUN,
  });
  if (error) {
    console.error("Could not claim uptime monitors", error.message);
    return Response.json({ error: "Could not claim monitors." }, { status: 500 });
  }

  const monitors = (data ?? []) as DueMonitor[];
  let failedWrites = 0;

  // Sequential checks keep this inexpensive and predictable on the Free plan.
  for (const monitor of monitors) {
    const result = await checkTarget(monitor);
    const { error: recordError } = await supabase.rpc("record_uptime_check", {
      p_monitor_id: monitor.monitor_id,
      p_status_code: result.statusCode,
      p_response_ms: result.responseMs,
      p_error: result.error,
    });
    if (recordError) {
      failedWrites += 1;
      console.error("Could not record uptime check", monitor.monitor_id, recordError.message);
    }
  }

  return Response.json({ processed: monitors.length, failedWrites });
});
