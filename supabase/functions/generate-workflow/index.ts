import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { keyword, tool_ids, mode } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tools info if tool_ids provided
    let toolsContext = "";
    if (tool_ids && tool_ids.length > 0) {
      const { data: tools } = await supabase
        .from("tools")
        .select("id, name, short_description, pricing_type, website_url")
        .in("id", tool_ids);
      if (tools && tools.length > 0) {
        toolsContext = `\n\nSelected tools on our platform:\n${tools.map((t: any) => `- ${t.name} (ID: ${t.id}): ${t.short_description || "No description"} [${t.pricing_type}]`).join("\n")}`;
      }
    }

    // Fetch popular tools for suggestions
    let popularToolsContext = "";
    if (mode === "suggest" || !tool_ids?.length) {
      const { data: popular } = await supabase
        .from("tools")
        .select("id, name, short_description, pricing_type")
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .limit(30);
      if (popular && popular.length > 0) {
        popularToolsContext = `\n\nPopular tools on our platform (use their exact IDs):\n${popular.map((t: any) => `- ${t.name} (ID: ${t.id}): ${t.short_description || ""} [${t.pricing_type}]`).join("\n")}`;
      }
    }

    const systemPrompt = `You are an expert content strategist and SEO specialist creating workflow guides for ToolScope - an AI tools directory.

Your task: Generate a COMPLETE, SEO-optimized workflow with rich content that drives organic traffic and user engagement.

Content requirements:
1. **Problem Statement**: Clear pain point this workflow solves (2-3 sentences, relatable)
2. **Solution Overview**: How this workflow addresses the problem
3. **Step-by-step guide**: 3-7 practical steps with tool recommendations
4. **Common Mistakes**: 3-5 mistakes users typically make (helps with "People Also Ask" SEO)
5. **Pro Tips**: 3-5 actionable tips for better results
6. **Prerequisites**: What users need before starting
7. **Target Audience**: Who benefits most
8. **Use Cases**: 2-4 specific scenarios where this workflow shines
9. **Estimated Time**: Realistic completion time
10. **Difficulty Level**: beginner / intermediate / advanced
11. **SEO metadata**: Optimized title (<60 chars) and description (<160 chars) with target keywords

Guidelines:
- Write ALL content in Vietnamese
- Be specific, actionable, and practical
- Use natural language that targets long-tail keywords
- Steps should have detailed descriptions (3-5 sentences each)
- Categories: Design, Marketing, Development, Content, Productivity, Business, AI, Data
- The slug should be lowercase, hyphen-separated Vietnamese (no diacritics)
- Prioritize tools from the platform when applicable
12. **YouTube Video Suggestions**: Suggest 3-5 real YouTube search queries (in Vietnamese and English) that would find relevant tutorial/guide videos for this workflow topic. Also suggest specific video titles that likely exist on YouTube.${toolsContext}${popularToolsContext}`;

    const userPrompt = keyword
      ? `Create a comprehensive, SEO-optimized workflow about: "${keyword}". ${tool_ids?.length ? "Incorporate the provided tools where relevant." : "Suggest appropriate tools from the platform."}`
      : `Based on the provided tools, create a practical, SEO-rich workflow that combines them effectively.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_workflow",
              description: "Create a complete SEO-optimized workflow",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Workflow title in Vietnamese" },
                  slug: { type: "string", description: "URL-friendly slug (no diacritics)" },
                  description: { type: "string", description: "Brief description in Vietnamese (2-3 sentences)" },
                  category: { type: "string", enum: ["Design", "Marketing", "Development", "Content", "Productivity", "Business", "AI", "Data"] },
                  seo_title: { type: "string", description: "SEO title under 60 chars with target keyword" },
                  seo_description: { type: "string", description: "Meta description under 160 chars" },
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string", description: "Detailed step description (3-5 sentences)" },
                        tool_id: { type: "string", description: "Tool UUID from platform or null" },
                      },
                      required: ["title", "description"],
                      additionalProperties: false,
                    },
                  },
                  tool_ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "All tool IDs used in this workflow",
                  },
                  seo_content: {
                    type: "object",
                    properties: {
                      problem: { type: "string", description: "Pain point description (2-3 sentences)" },
                      solution: { type: "string", description: "How this workflow solves the problem" },
                      common_mistakes: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["title", "description"],
                          additionalProperties: false,
                        },
                      },
                      tips: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["title", "description"],
                          additionalProperties: false,
                        },
                      },
                      prerequisites: {
                        type: "array",
                        items: { type: "string" },
                      },
                      target_audience: { type: "string" },
                      use_cases: {
                        type: "array",
                        items: { type: "string" },
                      },
                      estimated_time: { type: "string", description: "e.g. 30 phút, 1-2 giờ" },
                      difficulty_level: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                    },
                    required: ["problem", "solution", "common_mistakes", "tips", "prerequisites", "target_audience", "use_cases", "estimated_time", "difficulty_level"],
                    additionalProperties: false,
                  },
                  suggested_videos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        search_query: { type: "string", description: "YouTube search query to find this video" },
                        title: { type: "string", description: "Expected video title" },
                        reason: { type: "string", description: "Why this video is relevant" },
                      },
                      required: ["search_query", "title", "reason"],
                      additionalProperties: false,
                    },
                    description: "3-5 YouTube video search suggestions related to this workflow",
                  },
                },
                required: ["title", "slug", "description", "category", "seo_title", "seo_description", "steps", "tool_ids", "seo_content"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_workflow" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Vui lòng thử lại sau." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Hết credit AI. Vui lòng nạp thêm." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output");
    }

    const workflow = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(workflow), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-workflow error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
