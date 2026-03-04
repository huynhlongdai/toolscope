import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const aiScore = tool.ai_scores as any;

    const prompt = `Viết một bài giới thiệu chi tiết và chuyên sâu bằng tiếng Việt cho công cụ "${tool.name}". Bài viết dạng editorial, format Markdown.

Thông tin có sẵn:
- Tên: ${tool.name}
- Mô tả ngắn: ${tool.short_description || "N/A"}
- Mô tả: ${tool.description || "N/A"}
- Website: ${tool.website_url || "N/A"}
- Loại giá: ${tool.pricing_type}
- Category: ${(tool.categories as any)?.name || "N/A"}
- Platforms: ${tool.platforms?.join(", ") || "N/A"}
- AI Score: ${aiScore?.overall_score || "N/A"}/10
- Ưu điểm: ${aiScore?.pros?.join(", ") || "N/A"}
- Nhược điểm: ${aiScore?.cons?.join(", ") || "N/A"}

Viết bài theo cấu trúc sau (dùng markdown headers ##):

## ${tool.name} là gì?
Giới thiệu tổng quan công cụ, lịch sử phát triển, đội ngũ đứng sau.

## Tính năng chính
Liệt kê và mô tả chi tiết 5-8 tính năng nổi bật nhất. Mỗi tính năng 2-3 câu.

## Đặc điểm nổi bật
Điều gì khiến tool này khác biệt so với đối thủ? USP (Unique Selling Points).

## Bảng giá & Gói dịch vụ
Mô tả các gói giá (Free, Pro, Enterprise...). Nếu không biết chính xác, ghi rõ "Vui lòng truy cập website để xem bảng giá mới nhất".

## Ai nên sử dụng ${tool.name}?
Đối tượng phù hợp: freelancer, startup, doanh nghiệp lớn, sinh viên, v.v.

## Hướng dẫn bắt đầu
Các bước cơ bản để bắt đầu sử dụng tool.

## Ưu điểm & Nhược điểm
Bảng tóm tắt ưu/nhược rõ ràng.

## Kết luận
Đánh giá tổng thể và khuyến nghị.

Yêu cầu: viết chuyên nghiệp, khách quan, giàu thông tin. Dùng bold, lists, blockquotes khi cần. KHÔNG viết heading cấp 1 (#).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Bạn là chuyên gia công nghệ, viết bài giới thiệu công cụ chi tiết, chuyên nghiệp, chuẩn SEO." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Save to DB
    const { error: updateErr } = await supabase
      .from("tools")
      .update({ detailed_content: content })
      .eq("id", tool_id);

    if (updateErr) console.error("Failed to save content:", updateErr);

    return new Response(JSON.stringify({ content, saved: !updateErr }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-tool-article error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
