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
    if (!tool_id) return new Response(JSON.stringify({ error: "tool_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: tool, error: toolErr } = await supabase.from("tools").select("*, categories(name), ai_scores(*)").eq("id", tool_id).maybeSingle();
    if (toolErr || !tool) return new Response(JSON.stringify({ error: "Tool not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const aiScore = tool.ai_scores as any;

    const prompt = `Viết một bài giới thiệu chi tiết bằng tiếng Việt cho công cụ "${tool.name}". Format Markdown.
Thông tin: Tên: ${tool.name}, Mô tả: ${tool.short_description || "N/A"}, Website: ${tool.website_url || "N/A"}, Giá: ${tool.pricing_type}, Category: ${(tool.categories as any)?.name || "N/A"}, AI Score: ${aiScore?.overall_score || "N/A"}/10
Viết theo cấu trúc: ## Là gì?, ## Tính năng chính, ## Đặc điểm nổi bật, ## Bảng giá, ## Ai nên sử dụng?, ## Hướng dẫn, ## Ưu nhược điểm (bảng), ## Kết luận, ## FAQ (dùng ### cho câu hỏi)`;

    const response = await callAI({
      feature: "content_generation",
      messages: [
        { role: "system", content: "Bạn là chuyên gia công nghệ, viết bài giới thiệu công cụ chi tiết, chuyên nghiệp, chuẩn SEO." },
        { role: "user", content: prompt },
      ],
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse FAQ
    const faqSection = content.split(/##\s*Câu hỏi thường gặp/i)[1] || "";
    const faqRegex = /###\s*(.+?\?)\s*\n([\s\S]*?)(?=###|$)/g;
    const faq: { question: string; answer: string }[] = [];
    let match;
    while ((match = faqRegex.exec(faqSection)) !== null) {
      const q = match[1].trim(), a = match[2].trim();
      if (q && a) faq.push({ question: q, answer: a });
    }

    const updateData: any = { detailed_content: content };
    if (faq.length > 0) updateData.faq = faq;

    const { error: updateErr } = await supabase.from("tools").update(updateData).eq("id", tool_id);
    if (updateErr) console.error("Failed to save:", updateErr);

    return new Response(JSON.stringify({ content, saved: !updateErr }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-tool-article error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
