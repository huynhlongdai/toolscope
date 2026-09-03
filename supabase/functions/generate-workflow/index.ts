import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-provider.ts";
import { corsHeaders, requireAdmin } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const { keyword, tool_ids, mode } = await req.json();

    const supabase = auth.supabase;

    let toolsContext = "";
    if (tool_ids && tool_ids.length > 0) {
      const { data: tools } = await supabase.from("tools").select("id, name, short_description, pricing_type, website_url").in("id", tool_ids);
      if (tools?.length) toolsContext = `\n\nSelected tools:\n${tools.map((t: any) => `- ${t.name} (ID: ${t.id}): ${t.short_description || ""} [${t.pricing_type}]`).join("\n")}`;
    }

    let popularToolsContext = "";
    if (mode === "suggest" || !tool_ids?.length) {
      const { data: popular } = await supabase.from("tools").select("id, name, short_description, pricing_type").eq("status", "published").order("view_count", { ascending: false }).limit(30);
      if (popular?.length) popularToolsContext = `\n\nPopular tools:\n${popular.map((t: any) => `- ${t.name} (ID: ${t.id}): ${t.short_description || ""} [${t.pricing_type}]`).join("\n")}`;
    }

    const systemPrompt = `You are an expert content strategist creating workflow guides for ToolScope - an AI tools directory.
Generate a COMPLETE, SEO-optimized workflow with rich content. Write ALL content in Vietnamese.
Categories: Design, Marketing, Development, Content, Productivity, Business, AI, Data${toolsContext}${popularToolsContext}`;

    const userPrompt = keyword
      ? `Create a comprehensive workflow about: "${keyword}". ${tool_ids?.length ? "Incorporate the provided tools." : "Suggest appropriate tools."}`
      : `Based on the provided tools, create a practical workflow that combines them effectively.`;

    const response = await callAI({
      feature: "workflow_generation",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "create_workflow",
          description: "Create a complete SEO-optimized workflow",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" }, slug: { type: "string" }, description: { type: "string" },
              category: { type: "string", enum: ["Design", "Marketing", "Development", "Content", "Productivity", "Business", "AI", "Data"] },
              seo_title: { type: "string" }, seo_description: { type: "string" },
              steps: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, tool_id: { type: "string" } }, required: ["title", "description"], additionalProperties: false } },
              tool_ids: { type: "array", items: { type: "string" } },
              seo_content: {
                type: "object",
                properties: {
                  problem: { type: "string" }, solution: { type: "string" },
                  common_mistakes: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title", "description"], additionalProperties: false } },
                  tips: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title", "description"], additionalProperties: false } },
                  prerequisites: { type: "array", items: { type: "string" } },
                  target_audience: { type: "string" }, use_cases: { type: "array", items: { type: "string" } },
                  estimated_time: { type: "string" }, difficulty_level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                },
                required: ["problem", "solution", "common_mistakes", "tips", "prerequisites", "target_audience", "use_cases", "estimated_time", "difficulty_level"],
                additionalProperties: false,
              },
              suggested_videos: { type: "array", items: { type: "object", properties: { search_query: { type: "string" }, title: { type: "string" }, reason: { type: "string" } }, required: ["search_query", "title", "reason"], additionalProperties: false } },
            },
            required: ["title", "slug", "description", "category", "seo_title", "seo_description", "steps", "tool_ids", "seo_content", "suggested_videos"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "create_workflow" } },
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Hết credit AI" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return structured output");

    return new Response(JSON.stringify(JSON.parse(toolCall.function.arguments)), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-workflow error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
