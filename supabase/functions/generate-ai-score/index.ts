import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tool_id } = await req.json();
    if (!tool_id) throw new Error("tool_id is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tool info
    const { data: tool, error: toolErr } = await supabase
      .from("tools")
      .select("name, description, short_description, pricing_type, features, website_url")
      .eq("id", tool_id)
      .single();

    if (toolErr || !tool) throw new Error("Tool not found");

    const prompt = `Analyze this AI tool and provide a detailed evaluation. Tool: "${tool.name}". Description: "${tool.description || tool.short_description || 'N/A'}". Pricing: ${tool.pricing_type}. Website: ${tool.website_url || 'N/A'}. Features: ${JSON.stringify(tool.features || [])}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an AI tool analyst. Evaluate tools on a 0-10 scale. Be fair, balanced and honest.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_ai_score",
              description: "Submit the AI evaluation score for a tool",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "number", description: "Overall score 0-10" },
                  ease_of_use: { type: "number", description: "Ease of use score 0-10" },
                  features: { type: "number", description: "Features score 0-10" },
                  value_for_money: { type: "number", description: "Value for money score 0-10" },
                  support: { type: "number", description: "Support score 0-10" },
                  performance: { type: "number", description: "Performance score 0-10" },
                  pros: { type: "array", items: { type: "string" }, description: "List of 3-5 pros" },
                  cons: { type: "array", items: { type: "string" }, description: "List of 2-4 cons" },
                  summary: { type: "string", description: "Brief summary in Vietnamese, 2-3 sentences" },
                  is_recommended: { type: "boolean", description: "Whether to recommend this tool" },
                },
                required: ["overall_score", "ease_of_use", "features", "value_for_money", "support", "performance", "pros", "cons", "summary", "is_recommended"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_ai_score" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const scores = JSON.parse(toolCall.function.arguments);

    // Upsert ai_scores
    const { error: upsertErr } = await supabase
      .from("ai_scores")
      .upsert({
        tool_id,
        overall_score: scores.overall_score,
        ease_of_use: scores.ease_of_use,
        features: scores.features,
        value_for_money: scores.value_for_money,
        support: scores.support,
        performance: scores.performance,
        pros: scores.pros,
        cons: scores.cons,
        summary: scores.summary,
        is_recommended: scores.is_recommended,
        evaluated_at: new Date().toISOString(),
      }, { onConflict: "tool_id" });

    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ success: true, scores }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ai-score error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
