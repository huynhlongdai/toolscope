import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Process up to N items per invocation to avoid function timeout
const BATCH_SIZE = 5;
const DELAY_BETWEEN_ITEMS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch pending items from queue, oldest first
    const { data: pendingItems, error: fetchErr } = await supabase
      .from("translation_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) {
      throw new Error(`Failed to fetch queue: ${fetchErr.message}`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending items", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{
      id: string;
      entity_type: string;
      entity_id: string;
      status: string;
    }> = [];

    for (const item of pendingItems) {
      // Mark as processing
      await supabase
        .from("translation_queue")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", item.id);

      try {
        // Call auto-translate-all
        const { data, error } = await supabase.functions.invoke(
          "auto-translate-all",
          {
            body: {
              entity_type: item.entity_type,
              entity_id: item.entity_id,
              locales: item.target_locales,
            },
          }
        );

        if (error) {
          await supabase
            .from("translation_queue")
            .update({
              status: "failed",
              error_message: error.message,
              attempts: (item.attempts || 0) + 1,
              completed_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          results.push({
            id: item.id,
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            status: "failed",
          });
        } else {
          const hasErrors = data?.errors > 0;
          await supabase
            .from("translation_queue")
            .update({
              status: hasErrors ? "partial" : "completed",
              completed_at: new Date().toISOString(),
              result_summary: data?.results || {},
              attempts: (item.attempts || 0) + 1,
            })
            .eq("id", item.id);

          results.push({
            id: item.id,
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            status: hasErrors ? "partial" : "completed",
          });
        }
      } catch (e) {
        await supabase
          .from("translation_queue")
          .update({
            status: "failed",
            error_message: e instanceof Error ? e.message : "Unknown error",
            attempts: (item.attempts || 0) + 1,
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          status: "failed",
        });
      }

      // Throttle between items
      await sleep(DELAY_BETWEEN_ITEMS);
    }

    // Check if there are more pending items
    const { count } = await supabase
      .from("translation_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
        remaining_in_queue: count || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-translation-queue error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
