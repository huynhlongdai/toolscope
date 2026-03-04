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
    // mode: "keyword" | "tools" | "both"

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
        toolsContext = `\n\nAvailable tools on our platform:\n${tools.map((t: any) => `- ${t.name} (ID: ${t.id}): ${t.short_description || "No description"} [${t.pricing_type}]`).join("\n")}`;
      }
    }

    // If mode is "tools" but no keyword, fetch some popular tools for suggestions
    let popularToolsContext = "";
    if (mode === "suggest") {
      const { data: popular } = await supabase
        .from("tools")
        .select("id, name, short_description, pricing_type")
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .limit(30);
      if (popular && popular.length > 0) {
        popularToolsContext = `\n\nPopular tools on our platform (use their exact IDs when referencing):\n${popular.map((t: any) => `- ${t.name} (ID: ${t.id}): ${t.short_description || ""} [${t.pricing_type}]`).join("\n")}`;
      }
    }

    const systemPrompt = `You are an AI assistant that creates detailed workflow guides for an AI tools directory website.
Your task is to generate a complete workflow with title, description, category, and step-by-step instructions.

Each step should have:
- title: concise action title
- description: detailed explanation (2-3 sentences)  
- tool_id: the ID of a tool from the platform (if applicable, null otherwise)

Guidelines:
- Create practical, actionable workflows that combine multiple tools
- Each workflow should have 3-7 steps
- Use Vietnamese for all content (title, description, steps)
- Categories should be one of: Design, Marketing, Development, Content, Productivity, Business, AI, Data
- When tools from the platform are provided, prioritize using them in steps
- The slug should be lowercase, hyphen-separated, no special characters${toolsContext}${popularToolsContext}`;

    const userPrompt = keyword
      ? `Create a detailed workflow about: "${keyword}". ${tool_ids?.length ? "Incorporate the provided tools where relevant." : "Suggest appropriate tools from the platform."}`
      : `Based on the provided tools, create a practical workflow that combines them effectively.`;

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
              description: "Create a complete workflow with steps",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Workflow title in Vietnamese" },
                  slug: { type: "string", description: "URL-friendly slug" },
                  description: { type: "string", description: "Brief description in Vietnamese" },
                  category: { type: "string", enum: ["Design", "Marketing", "Development", "Content", "Productivity", "Business", "AI", "Data"] },
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        tool_id: { type: "string", description: "Tool UUID from platform or null" },
                      },
                      required: ["title", "description"],
                      additionalProperties: false,
                    },
                  },
                  tool_ids: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of tool IDs used in this workflow",
                  },
                },
                required: ["title", "slug", "description", "category", "steps", "tool_ids"],
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
