import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYNCABLE_TABLES = [
  "tools", "categories", "tags", "tool_tags", "reviews", "blog_posts",
  "site_settings", "menus", "pages", "deals", "tasks", "collections",
  "collection_items", "launches", "follows", "notifications", "user_roles",
];

const TABLES_WITH_UPDATED_AT = [
  "tools", "categories", "reviews", "blog_posts", "site_settings",
  "menus", "pages", "deals", "tasks", "collections", "launches", "notifications",
];

interface SyncRequest {
  direction: "push" | "pull" | "both";
  tables?: string[];
  lastSyncAt?: string;
  auto?: boolean;
  action?: "enable_auto" | "disable_auto" | "update_interval";
  interval?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const localUrl = Deno.env.get("SUPABASE_URL")!;
    const localServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");

    // Auth: support both user token and cron key
    const authHeader = req.headers.get("Authorization");
    const cronKey = req.headers.get("x-cron-key");
    let isCronCall = false;
    let userId: string | null = null;

    if (cronKey && cronKey === localServiceKey) {
      isCronCall = true;
    } else if (authHeader?.startsWith("Bearer ")) {
      const localClient = createClient(localUrl, localServiceKey, {
        auth: { persistSession: false },
      });

      const anonClient = createClient(localUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      userId = claimsData.claims.sub as string;

      // Check admin role
      const { data: roleData } = await localClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return jsonResponse({ error: "Admin access required" }, 403);
      }
    } else {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const localClient = createClient(localUrl, localServiceKey, {
      auth: { persistSession: false },
    });

    const body: SyncRequest = await req.json();

    // Handle cron management actions
    if (body.action) {
      return await handleCronAction(localClient, body, localUrl, localServiceKey);
    }

    if (!externalUrl || !externalKey) {
      return jsonResponse({
        error: "External credentials not configured. Please add EXTERNAL_SUPABASE_URL and EXTERNAL_SUPABASE_SERVICE_KEY secrets.",
      }, 400);
    }

    const externalClient = createClient(externalUrl, externalKey, {
      auth: { persistSession: false },
    });

    // For auto/cron calls: use all tables, direction=both, get lastSyncAt from logs
    let direction = body.direction || "both";
    let tables = body.tables || SYNCABLE_TABLES;
    let lastSyncAt = body.lastSyncAt;

    if (isCronCall || body.auto) {
      direction = "both";
      tables = SYNCABLE_TABLES;

      // Get last completed sync time
      const { data: lastSync } = await localClient
        .from("sync_logs")
        .select("completed_at")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastSync?.completed_at) {
        lastSyncAt = lastSync.completed_at;
      }
    }

    const validTables = tables.filter((t) => SYNCABLE_TABLES.includes(t));
    if (validTables.length === 0) {
      return jsonResponse({ error: "No valid tables selected" }, 400);
    }

    // Create sync log
    const { data: syncLog } = await localClient
      .from("sync_logs")
      .insert({
        direction,
        tables_synced: validTables,
        status: "running",
        created_by: userId,
      })
      .select()
      .single();

    let totalPushed = 0;
    let totalPulled = 0;
    let totalConflicts = 0;
    const errors: string[] = [];
    const tableResults: Record<string, { pushed: number; pulled: number; conflicts: number }> = {};

    for (const table of validTables) {
      try {
        const result = { pushed: 0, pulled: 0, conflicts: 0 };

        if (direction === "push" || direction === "both") {
          const pushed = await syncTable(localClient, externalClient, table, lastSyncAt);
          result.pushed = pushed.rows;
          result.conflicts += pushed.conflicts;
        }

        if (direction === "pull" || direction === "both") {
          const pulled = await syncTable(externalClient, localClient, table, lastSyncAt);
          result.pulled = pulled.rows;
          result.conflicts += pulled.conflicts;
        }

        tableResults[table] = result;
        totalPushed += result.pushed;
        totalPulled += result.pulled;
        totalConflicts += result.conflicts;
      } catch (err) {
        errors.push(`${table}: ${err.message}`);
      }
    }

    // Update sync log
    if (syncLog) {
      await localClient
        .from("sync_logs")
        .update({
          rows_pushed: totalPushed,
          rows_pulled: totalPulled,
          conflicts: totalConflicts,
          status: errors.length > 0 ? "partial" : "completed",
          error_message: errors.length > 0 ? errors.join("; ") : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLog.id);
    }

    return jsonResponse({
      success: true,
      syncId: syncLog?.id,
      summary: { pushed: totalPushed, pulled: totalPulled, conflicts: totalConflicts },
      tableResults,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleCronAction(
  client: ReturnType<typeof createClient>,
  body: SyncRequest,
  supabaseUrl: string,
  serviceKey: string
) {
  const CRON_JOB_NAME = "auto-sync-database";
  const functionUrl = `${supabaseUrl}/functions/v1/sync-database`;

  if (body.action === "enable_auto") {
    const interval = body.interval || "*/5 * * * *";

    // Unschedule existing job first (ignore errors if not exists)
    try {
      await client.rpc("unschedule_cron_job", { job_name: CRON_JOB_NAME });
    } catch (_) { /* ignore */ }

    // Schedule new cron job using pg_cron + pg_net
    const { error } = await client.rpc("schedule_auto_sync", {
      job_name: CRON_JOB_NAME,
      cron_expr: interval,
      fn_url: functionUrl,
      svc_key: serviceKey,
    });

    if (error) {
      return jsonResponse({ error: `Failed to enable auto sync: ${error.message}` }, 500);
    }

    // Save config
    await client.from("site_settings").upsert(
      {
        key: "auto_sync_config",
        value: { enabled: true, interval, updated_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    return jsonResponse({ success: true, message: "Auto sync enabled", interval });
  }

  if (body.action === "disable_auto") {
    try {
      await client.rpc("unschedule_cron_job", { job_name: CRON_JOB_NAME });
    } catch (_) { /* ignore */ }

    await client.from("site_settings").upsert(
      {
        key: "auto_sync_config",
        value: { enabled: false, updated_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    return jsonResponse({ success: true, message: "Auto sync disabled" });
  }

  if (body.action === "update_interval") {
    if (!body.interval) {
      return jsonResponse({ error: "interval is required" }, 400);
    }

    // Disable then re-enable with new interval
    try {
      await client.rpc("unschedule_cron_job", { job_name: CRON_JOB_NAME });
    } catch (_) { /* ignore */ }

    const { error } = await client.rpc("schedule_auto_sync", {
      job_name: CRON_JOB_NAME,
      cron_expr: body.interval,
      fn_url: functionUrl,
      svc_key: serviceKey,
    });

    if (error) {
      return jsonResponse({ error: `Failed to update interval: ${error.message}` }, 500);
    }

    await client.from("site_settings").upsert(
      {
        key: "auto_sync_config",
        value: { enabled: true, interval: body.interval, updated_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    return jsonResponse({ success: true, message: "Interval updated", interval: body.interval });
  }

  return jsonResponse({ error: "Unknown action" }, 400);
}

async function syncTable(
  source: ReturnType<typeof createClient>,
  target: ReturnType<typeof createClient>,
  table: string,
  lastSyncAt?: string
): Promise<{ rows: number; conflicts: number }> {
  let query = source.from(table).select("*");

  if (lastSyncAt && TABLES_WITH_UPDATED_AT.includes(table)) {
    query = query.gte("updated_at", lastSyncAt);
  }

  const { data: sourceData, error: sourceError } = await query.limit(5000);
  if (sourceError) throw new Error(`Read ${table}: ${sourceError.message}`);
  if (!sourceData || sourceData.length === 0) return { rows: 0, conflicts: 0 };

  let conflicts = 0;

  if (TABLES_WITH_UPDATED_AT.includes(table)) {
    const ids = sourceData.map((r: any) => r.id).filter(Boolean);
    if (ids.length > 0) {
      const { data: targetData } = await target
        .from(table)
        .select("id, updated_at")
        .in("id", ids);

      if (targetData) {
        const targetMap = new Map(targetData.map((r: any) => [r.id, r.updated_at]));
        const filtered = sourceData.filter((row: any) => {
          const targetUpdated = targetMap.get(row.id);
          if (!targetUpdated) return true;
          if (new Date(row.updated_at) >= new Date(targetUpdated)) return true;
          conflicts++;
          return false;
        });

        if (filtered.length > 0) {
          for (let i = 0; i < filtered.length; i += 500) {
            const chunk = filtered.slice(i, i + 500);
            const { error: upsertError } = await target.from(table).upsert(chunk, {
              onConflict: table === "site_settings" ? "key" : "id",
              ignoreDuplicates: false,
            });
            if (upsertError) throw new Error(`Upsert ${table}: ${upsertError.message}`);
          }
        }
        return { rows: filtered.length, conflicts };
      }
    }
  }

  for (let i = 0; i < sourceData.length; i += 500) {
    const chunk = sourceData.slice(i, i + 500);
    const conflictColumn = table === "site_settings" ? "key" : table === "tool_tags" ? "tool_id,tag_id" : "id";
    const { error: upsertError } = await target.from(table).upsert(chunk, {
      onConflict: conflictColumn,
      ignoreDuplicates: false,
    });
    if (upsertError) throw new Error(`Upsert ${table}: ${upsertError.message}`);
  }

  return { rows: sourceData.length, conflicts: 0 };
}
