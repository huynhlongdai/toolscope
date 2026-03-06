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
    const { tool_id } = await req.json();
    if (!tool_id) {
      return new Response(JSON.stringify({ error: "tool_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tool, error: toolErr } = await supabase
      .from("tools")
      .select("*, categories(name), ai_scores(*)")
      .eq("id", tool_id)
      .maybeSingle();

    if (toolErr || !tool) {
      return new Response(JSON.stringify({ error: "Tool not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: reviews } = await supabase
      .from("reviews")
      .select("title, content")
      .eq("tool_id", tool_id)
      .eq("status", "published")
      .limit(5);

    const existingReviews = reviews?.map(r => `- ${r.title}: ${r.content?.slice(0, 200)}`).join("\n") || "Chưa có review.";
    const aiScore = tool.ai_scores as any;

    const prompt = `Viết một bài review chi tiết bằng tiếng Việt cho công cụ "${tool.name}" theo format markdown.

Thông tin tool:
- Tên: ${tool.name}
- Mô tả: ${tool.description || tool.short_description || "N/A"}
- Website: ${tool.website_url || "N/A"}
- Pricing: ${tool.pricing_type}
- Category: ${(tool.categories as any)?.name || "N/A"}
- AI Score: ${aiScore?.overall_score || "N/A"}/10
- Ưu điểm AI: ${aiScore?.pros?.join(", ") || "N/A"}
- Nhược điểm AI: ${aiScore?.cons?.join(", ") || "N/A"}

Reviews hiện có:
${existingReviews}

Yêu cầu bài viết:
1. **Tiêu đề** hấp dẫn
2. **Giới thiệu** ngắn gọn về tool
3. **Tính năng nổi bật** (liệt kê 4-6 tính năng chính)
4. **Trải nghiệm sử dụng** (mô tả chi tiết)
5. **Ưu điểm** (bullet points)
6. **Nhược điểm** (bullet points)
7. **So sánh với alternatives** (nếu biết)
8. **Ai nên dùng?** (target audience)
9. **Kết luận & Đánh giá**

Viết chuyên nghiệp, khách quan, có chiều sâu. Dùng markdown formatting (headers, bold, lists, blockquotes).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Bạn là chuyên gia review công cụ công nghệ. Viết bài review chuyên sâu, khách quan." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const generatedContent = aiData.choices?.[0]?.message?.content || "";

    // Extract title from first markdown heading
    const titleMatch = generatedContent.match(/^#\s+(.+)/m);
    const generatedTitle = titleMatch ? titleMatch[1].trim() : `Review: ${tool.name}`;

    return new Response(JSON.stringify({
      title: generatedTitle,
      content: generatedContent,
      tool_name: tool.name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-review error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
