import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all active schedules that are due
    const { data: schedules, error } = await supabase
      .from("collect_schedules")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;
    if (!schedules?.length) {
      return new Response(JSON.stringify({ message: "No active schedules" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const schedule of schedules) {
      // Check if it's time to run based on cron expression (simple check: skip if ran in last hour)
      if (schedule.last_run_at) {
        const lastRun = new Date(schedule.last_run_at).getTime();
        const now = Date.now();
        const hoursSinceLastRun = (now - lastRun) / (1000 * 60 * 60);
        
        // Parse cron to determine minimum interval
        const cron = schedule.cron_expression;
        let minHours = 24;
        if (cron.includes("*/3")) minHours = 72;
        if (cron.includes("1 * *") && cron.endsWith("* *")) minHours = 720; // monthly
        if (cron.includes("* * 1")) minHours = 168; // weekly
        
        if (hoursSinceLastRun < minHours * 0.9) {
          results.push({ schedule_id: schedule.id, keyword: schedule.keyword, skipped: true, reason: "Not due yet" });
          continue;
        }
      }

      try {
        // Call collect-ai function with run-schedule action
        const collectUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/collect-ai`;
        const response = await fetch(collectUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ action: "run-schedule", schedule_id: schedule.id }),
        });

        const data = await response.json();
        results.push({ schedule_id: schedule.id, keyword: schedule.keyword, ...data });
      } catch (e: any) {
        results.push({ schedule_id: schedule.id, keyword: schedule.keyword, error: e.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scheduled-collect error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
