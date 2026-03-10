import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYNCABLE_TABLES = [
  "tools",
  "categories",
  "tags",
  "tool_tags",
  "reviews",
  "blog_posts",
  "site_settings",
  "menus",
  "pages",
  "deals",
  "tasks",
  "collections",
  "collection_items",
  "launches",
  "follows",
  "notifications",
  "user_roles",
];

// Tables that use `updated_at` for conflict resolution
const TABLES_WITH_UPDATED_AT = [
  "tools", "categories", "reviews", "blog_posts", "site_settings",
  "menus", "pages", "deals", "tasks", "collections", "launches",
  "notifications",
];

interface SyncRequest {
  direction: "push" | "pull" | "both";
  tables: string[];
  lastSyncAt?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const localUrl = Deno.env.get("SUPABASE_URL")!;
    const localServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");

    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({ error: "External Supabase credentials not configured. Please add EXTERNAL_SUPABASE_URL and EXTERNAL_SUPABASE_SERVICE_KEY secrets." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const localClient = createClient(localUrl, localServiceKey, {
      auth: { persistSession: false },
    });

    // Verify admin role
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(localUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Check admin role
    const { data: roleData } = await localClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const externalClient = createClient(externalUrl, externalKey, {
      auth: { persistSession: false },
    });

    const body: SyncRequest = await req.json();
    const { direction, tables, lastSyncAt } = body;

    // Validate tables
    const validTables = tables.filter((t) => SYNCABLE_TABLES.includes(t));
    if (validTables.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid tables selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    return new Response(
      JSON.stringify({
        success: true,
        syncId: syncLog?.id,
        summary: { pushed: totalPushed, pulled: totalPulled, conflicts: totalConflicts },
        tableResults,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function syncTable(
  source: ReturnType<typeof createClient>,
  target: ReturnType<typeof createClient>,
  table: string,
  lastSyncAt?: string
): Promise<{ rows: number; conflicts: number }> {
  let query = source.from(table).select("*");

  // Incremental sync if lastSyncAt provided and table has updated_at
  if (lastSyncAt && TABLES_WITH_UPDATED_AT.includes(table)) {
    query = query.gte("updated_at", lastSyncAt);
  }

  const { data: sourceData, error: sourceError } = await query.limit(5000);
  if (sourceError) throw new Error(`Read ${table}: ${sourceError.message}`);
  if (!sourceData || sourceData.length === 0) return { rows: 0, conflicts: 0 };

  let conflicts = 0;

  // For tables with updated_at, check for conflicts
  if (TABLES_WITH_UPDATED_AT.includes(table)) {
    const ids = sourceData.map((r: any) => r.id).filter(Boolean);
    if (ids.length > 0) {
      const { data: targetData } = await target
        .from(table)
        .select("id, updated_at")
        .in("id", ids);

      if (targetData) {
        const targetMap = new Map(targetData.map((r: any) => [r.id, r.updated_at]));
        // Filter: only upsert if source is newer or target doesn't exist
        const filtered = sourceData.filter((row: any) => {
          const targetUpdated = targetMap.get(row.id);
          if (!targetUpdated) return true; // new row
          if (new Date(row.updated_at) >= new Date(targetUpdated)) return true;
          conflicts++;
          return false;
        });

        if (filtered.length > 0) {
          // Batch upsert in chunks of 500
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

  // For tables without updated_at, just upsert all
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
