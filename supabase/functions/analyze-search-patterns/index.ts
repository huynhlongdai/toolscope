import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";

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

    // Get settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["auto_rule_threshold", "auto_rule_enabled"]);

    const settingsMap: Record<string, any> = {};
    settings?.forEach((s: any) => { settingsMap[s.key] = s.value; });

    const enabled = settingsMap.auto_rule_enabled === true || settingsMap.auto_rule_enabled === "true";
    const threshold = Number(settingsMap.auto_rule_threshold) || 10;

    if (!enabled) {
      return new Response(JSON.stringify({ message: "Auto-rule is disabled", rules_created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent search logs with matched_tool_ids
    const { data: logs, error: logsErr } = await supabase
      .from("search_logs")
      .select("normalized_query, matched_tool_ids")
      .not("matched_tool_ids", "eq", "{}")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (logsErr) throw logsErr;
    if (!logs || logs.length === 0) {
      return new Response(JSON.stringify({ message: "No search logs with tool results", rules_created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Count keyword frequency and collect tool IDs
    const keywordData: Record<string, { count: number; toolIds: Record<string, number> }> = {};
    for (const log of logs) {
      const kw = log.normalized_query;
      if (!keywordData[kw]) keywordData[kw] = { count: 0, toolIds: {} };
      keywordData[kw].count++;
      for (const tid of (log.matched_tool_ids || [])) {
        keywordData[kw].toolIds[tid] = (keywordData[kw].toolIds[tid] || 0) + 1;
      }
    }

    // Get existing rules to avoid duplicates
    const { data: existingRules } = await supabase
      .from("search_rules")
      .select("keyword_pattern, source_keywords");

    const existingPatterns = new Set<string>();
    const existingSourceKws = new Set<string>();
    existingRules?.forEach((r: any) => {
      existingPatterns.add(r.keyword_pattern?.toLowerCase());
      (r.source_keywords || []).forEach((sk: string) => existingSourceKws.add(sk.toLowerCase()));
    });

    // Filter out keywords that already have rules
    const uniqueKeywords = Object.entries(keywordData)
      .filter(([kw]) => !existingPatterns.has(kw) && !existingSourceKws.has(kw))
      .map(([keyword, data]) => ({ keyword, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    if (uniqueKeywords.length === 0) {
      return new Response(JSON.stringify({ message: "All keywords already have rules", rules_created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to cluster similar keywords (cheap model)
    const response = await callAI({
      feature: "ai_search",
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `You are a keyword clustering tool. Group similar/synonymous search keywords into clusters. 
Each cluster should have a representative keyword as the main pattern.
Only create clusters where the total search count >= ${threshold}.`
        },
        {
          role: "user",
          content: `Cluster these search keywords:\n${JSON.stringify(uniqueKeywords)}`
        },
      ],
      tools: [{
        type: "function",
        function: {
          name: "keyword_clusters",
          description: "Return clustered keywords",
          parameters: {
            type: "object",
            properties: {
              clusters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    pattern: { type: "string", description: "Main keyword pattern for the rule (use contains match)" },
                    keywords: { type: "array", items: { type: "string" }, description: "All similar keywords in this cluster" },
                    total_count: { type: "number", description: "Sum of search counts for all keywords" },
                  },
                  required: ["pattern", "keywords", "total_count"],
                },
              },
            },
            required: ["clusters"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "keyword_clusters" } },
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let clusters = { clusters: [] as any[] };
    if (toolCall?.function?.arguments) {
      try { clusters = JSON.parse(toolCall.function.arguments); } catch {}
    }

    // Create rules for clusters that meet threshold
    let rulesCreated = 0;
    for (const cluster of clusters.clusters) {
      if (cluster.total_count < threshold) continue;

      // Aggregate top tool IDs from all keywords in cluster
      const toolCounts: Record<string, number> = {};
      for (const kw of cluster.keywords) {
        const data = keywordData[kw];
        if (!data) continue;
        for (const [tid, cnt] of Object.entries(data.toolIds)) {
          toolCounts[tid] = (toolCounts[tid] || 0) + cnt;
        }
      }

      // Top 5 tools
      const topTools = Object.entries(toolCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);

      if (topTools.length === 0) continue;

      const { error: insertErr } = await supabase.from("search_rules").insert({
        keyword_pattern: cluster.pattern,
        match_type: "contains",
        pinned_tool_ids: topTools,
        is_auto: true,
        is_active: true,
        source_keywords: cluster.keywords,
      });

      if (!insertErr) rulesCreated++;
    }

    return new Response(JSON.stringify({
      message: `Analysis complete`,
      rules_created: rulesCreated,
      clusters_found: clusters.clusters.length,
      keywords_analyzed: uniqueKeywords.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("analyze-search-patterns error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
