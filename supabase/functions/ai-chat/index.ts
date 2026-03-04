import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch tools data for context
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tools } = await supabase
      .from("tools")
      .select("name, slug, short_description, pricing_type, avg_rating, categories(name), ai_scores(overall_score, is_recommended, pros, cons, summary)")
      .eq("status", "published")
      .limit(50);

    const toolsContext = tools?.map((t: any) =>
      `- **${t.name}** (/${t.slug}): ${t.short_description || "N/A"} | Giá: ${t.pricing_type} | Rating: ${t.avg_rating}/5 | AI Score: ${t.ai_scores?.overall_score || "N/A"}/10 | Category: ${t.categories?.name || "N/A"}`
    ).join("\n") || "Chưa có dữ liệu tools.";

    const systemPrompt = `Bạn là ToolScope AI - trợ lý tư vấn công cụ thông minh. Bạn giúp người dùng tìm, so sánh và chọn công cụ phù hợp.

Dữ liệu công cụ hiện có trong hệ thống:
${toolsContext}

Quy tắc:
- Trả lời bằng tiếng Việt, ngắn gọn, hữu ích
- Khi gợi ý tool, nêu lý do cụ thể
- So sánh ưu/nhược khi được hỏi
- Dùng markdown formatting (bold, list, headers)
- Nếu không có tool phù hợp trong DB, hãy nói rõ
- Thân thiện, chuyên nghiệp`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
