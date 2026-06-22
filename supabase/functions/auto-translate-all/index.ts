import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TARGET_LOCALES = [
  "vi", "zh", "ja", "ko", "th", "id", "es", "fr", "pt", "de",
];

// Delay between locale calls to avoid rate limits (ms)
const DELAY_BETWEEN_LOCALES = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { entity_type, entity_id, locales } = await req.json();

    if (!entity_type || !entity_id) {
      return new Response(
        JSON.stringify({ error: "entity_type and entity_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const targetLocales = locales || TARGET_LOCALES;

    // Determine which Edge Function to call based on entity_type
    const functionMap: Record<string, { fn: string; idField: string }> = {
      tool: { fn: "translate-tool", idField: "tool_id" },
      blog: { fn: "translate-blog", idField: "blog_id" },
      blog_post: { fn: "translate-blog", idField: "blog_id" },
      deal: { fn: "translate-blog", idField: "deal_id" },
      workflow: { fn: "translate-blog", idField: "workflow_id" },
      menu: { fn: "translate-menu", idField: "menu_id" },
      category: { fn: "translate-tool", idField: "tool_id" }, // categories use tool translate
    };

    const mapping = functionMap[entity_type];
    if (!mapping) {
      return new Response(
        JSON.stringify({ error: `Unsupported entity_type: ${entity_type}` }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results: Record<
      string,
      { success: boolean; saved?: number; error?: string }
    > = {};
    let successCount = 0;
    let errorCount = 0;

    for (const locale of targetLocales) {
      // Skip English (source language)
      if (locale === "en") continue;

      try {
        // Check if manual translation already exists — don't overwrite
        const { data: manualExists } = await supabase
          .from("translations")
          .select("id")
          .eq("entity_type", entity_type === "blog_post" ? "blog" : entity_type)
          .eq("entity_id", entity_id)
          .eq("locale", locale)
          .eq("is_auto", false)
          .limit(1);

        if (manualExists && manualExists.length > 0) {
          results[locale] = {
            success: true,
            saved: 0,
            error: "Skipped — manual translation exists",
          };
          continue;
        }

        // Call the appropriate translate function
        const { data, error } = await supabase.functions.invoke(mapping.fn, {
          body: { [mapping.idField]: entity_id, locale },
        });

        if (error) {
          results[locale] = { success: false, error: error.message };
          errorCount++;
        } else {
          results[locale] = { success: true, saved: data?.saved || 0 };
          successCount++;
        }
      } catch (e) {
        results[locale] = {
          success: false,
          error: e instanceof Error ? e.message : "Unknown error",
        };
        errorCount++;
      }

      // Rate limiting delay between calls
      if (locale !== targetLocales[targetLocales.length - 1]) {
        await sleep(DELAY_BETWEEN_LOCALES);
      }
    }

    // Update translation queue status if exists
    await supabase
      .from("translation_queue")
      .update({
        status: errorCount === 0 ? "completed" : "partial",
        completed_at: new Date().toISOString(),
        result_summary: results,
      })
      .eq("entity_type", entity_type)
      .eq("entity_id", entity_id)
      .eq("status", "processing");

    return new Response(
      JSON.stringify({
        entity_type,
        entity_id,
        total_locales: targetLocales.filter((l: string) => l !== "en").length,
        success: successCount,
        errors: errorCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("auto-translate-all error:", e);
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
