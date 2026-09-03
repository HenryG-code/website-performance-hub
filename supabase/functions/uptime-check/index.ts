import { createClient } from "npm:@supabase/supabase-js@2";

type DueMonitor = {
  monitor_id: string;
  target_url: string;
  timeout_ms: number;
  expected_status_min: number;
  expected_status_max: number;
};

type CheckResult = {
  statusCode: number | null;
  responseMs: number | null;
  error: string | null;
};

const MAX_MONITORS_PER_RUN = 25;

/**
 * A deliberately small prober: GET, no redirect following, and no response
 * body retained. A 2xx/3xx response means the target is reachable; redirects
 * are not followed so a changed target cannot turn this into an SSRF pivot.
 */
async function checkTarget(monitor: DueMonitor): Promise<CheckResult> {
  let url: URL;
  try {
    url = new URL(monitor.target_url);
  } catch {
    return { statusCode: null, responseMs: null, error: "Invalid monitor URL." };
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())
  ) {
    return { statusCode: null, responseMs: null, error: "Unsafe monitor URL." };
  }

  const started = performance.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(monitor.timeout_ms),
      headers: {
        "User-Agent": "PerformanceHub-Uptime/1.0",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
      },
    });
    // Availability monitoring has no need for a page body. Releasing it keeps
    // memory and egress use low even when the target sends a large response.
    await response.body?.cancel();

    return {
      statusCode: response.status,
      responseMs: Math.round(performance.now() - started),
      error: null,
    };
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    return {
      statusCode: null,
      responseMs: null,
      error: isTimeout ? "Request timed out." : "Network request failed.",
    };
  }
}

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
