import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, source } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalizedQuery = query.trim().toLowerCase();

    // Check search_rules for matching patterns
    const { data: rules } = await supabase
      .from("search_rules")
      .select("*")
      .eq("is_active", true);

    let pinnedToolIds: string[] = [];
    let redirectUrl: string | null = null;

    if (rules) {
      for (const rule of rules) {
        let matches = false;
        if (rule.match_type === "exact") {
          matches = normalizedQuery === rule.keyword_pattern.toLowerCase();
        } else if (rule.match_type === "contains") {
          matches = normalizedQuery.includes(rule.keyword_pattern.toLowerCase());
        } else if (rule.match_type === "regex") {
          try { matches = new RegExp(rule.keyword_pattern, "i").test(normalizedQuery); } catch {}
        }
        if (matches) {
          if (rule.redirect_url) redirectUrl = rule.redirect_url;
          if (rule.pinned_tool_ids?.length) pinnedToolIds.push(...rule.pinned_tool_ids);
        }
      }
    }

    // If redirect rule matched, return redirect
    if (redirectUrl) {
      // Still log the search
      await supabase.from("search_logs").insert({
        query,
        normalized_query: normalizedQuery,
        results_count: 0,
        source: source || "hero",
      });
      return new Response(
        JSON.stringify({ redirect: redirectUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all published tools
    const { data: tools, error } = await supabase
      .from("tools")
      .select("id, name, slug, short_description, description, pricing_type, avg_rating, rating_count, logo_url, is_trending, is_featured, categories(name), ai_scores(overall_score, is_recommended, pros, cons, summary)")
      .eq("status", "published")
      .limit(100);

    if (error) throw error;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const toolsSummary = tools?.map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      desc: t.short_description || t.description?.substring(0, 200),
      pricing: t.pricing_type,
      rating: t.avg_rating,
      category: t.categories?.name,
      ai_score: t.ai_scores?.overall_score,
      recommended: t.ai_scores?.is_recommended,
      trending: t.is_trending,
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Bạn là trợ lý tìm kiếm công cụ AI. Người dùng mô tả nhu cầu bằng ngôn ngữ tự nhiên. Bạn phân tích và trả về danh sách tool phù hợp nhất từ database.

Dữ liệu tools hiện có:
${JSON.stringify(toolsSummary)}

Trả về JSON với format:
{
  "results": [{"id": "...", "name": "...", "slug": "...", "reason": "Lý do ngắn gọn tại sao tool này phù hợp"}],
  "summary": "Tóm tắt ngắn gọn kết quả tìm kiếm"
}

Chỉ trả về tools thực sự phù hợp với nhu cầu. Sắp xếp theo mức độ phù hợp. Tối đa 10 kết quả.`
          },
          { role: "user", content: query },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "search_results",
              description: "Return matching tools",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        slug: { type: "string" },
                        reason: { type: "string" },
                      },
                      required: ["id", "name", "slug", "reason"],
                    },
                  },
                  summary: { type: "string" },
                },
                required: ["results", "summary"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "search_results" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let searchResults = { results: [], summary: "Không tìm thấy kết quả phù hợp." };

    if (toolCall?.function?.arguments) {
      try {
        searchResults = JSON.parse(toolCall.function.arguments);
      } catch { /* use default */ }
    }

    // Enrich results with full tool data
    const enrichedResults = searchResults.results.map((r: any) => {
      const fullTool = tools?.find((t: any) => t.id === r.id);
      return { ...r, tool: fullTool || null };
    }).filter((r: any) => r.tool);

    // Prepend pinned tools from rules (if not already in results)
    if (pinnedToolIds.length > 0) {
      const existingIds = new Set(enrichedResults.map((r: any) => r.id));
      for (const pinnedId of pinnedToolIds) {
        if (!existingIds.has(pinnedId)) {
          const pinnedTool = tools?.find((t: any) => t.id === pinnedId);
          if (pinnedTool) {
            enrichedResults.unshift({
              id: pinnedTool.id,
              name: pinnedTool.name,
              slug: pinnedTool.slug,
              reason: "Được đề xuất",
              tool: pinnedTool,
              pinned: true,
            });
          }
        }
      }
    }

    // Log the search (fire and forget)
    supabase.from("search_logs").insert({
      query,
      normalized_query: normalizedQuery,
      results_count: enrichedResults.length,
      source: source || "hero",
    }).then(() => {});

    return new Response(
      JSON.stringify({ results: enrichedResults, summary: searchResults.summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
