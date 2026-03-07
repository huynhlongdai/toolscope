import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOCALE_NAMES: Record<string, string> = {
  en: "English", zh: "Chinese (Simplified)", ja: "Japanese", ko: "Korean",
  th: "Thai", id: "Indonesian (Bahasa Indonesia)", es: "Spanish",
  fr: "French", pt: "Portuguese (Brazilian)", de: "German",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { blog_id, locale = "en" } = await req.json();
    if (!blog_id) return new Response(JSON.stringify({ error: "blog_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const targetLang = LOCALE_NAMES[locale];
    if (!targetLang) return new Response(JSON.stringify({ error: `Unsupported locale: ${locale}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: blog, error: blogErr } = await supabase
      .from("blog_posts")
      .select("id, title, excerpt, content")
      .eq("id", blog_id)
      .maybeSingle();

    if (blogErr || !blog) return new Response(JSON.stringify({ error: "Blog not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const fields = [
      { field: "title", text: blog.title },
      { field: "excerpt", text: blog.excerpt },
      { field: "content", text: blog.content?.substring(0, 8000) },
    ].filter(f => f.text);

    const prompt = `Translate the following Vietnamese blog content to ${targetLang}. Keep all HTML/Markdown formatting intact. Return a JSON object with the translated fields.

Fields to translate:
${fields.map(f => `- ${f.field}: """${f.text}"""`).join("\n\n")}

Return ONLY a valid JSON object like:
{ "title": "...", "excerpt": "...", "content": "..." }

Important: Preserve all HTML tags, Markdown formatting, URLs. Only translate human-readable text.`;

    const response = await callAI({
      feature: "content_generation",
      messages: [
        { role: "system", content: `You are a professional translator. Translate Vietnamese to ${targetLang} accurately while preserving all formatting.` },
        { role: "user", content: prompt },
      ],
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let translations: Record<string, string> = {};
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) translations = JSON.parse(jsonMatch[0]);
    } catch { throw new Error("Failed to parse AI translation response"); }

    const upserts = Object.entries(translations)
      .filter(([_, v]) => v)
      .map(([field, text]) => ({ entity_type: "blog", entity_id: blog_id, field_name: field, locale, translated_text: text, is_auto: true }));

    if (upserts.length > 0) {
      await supabase.from("translations").delete().eq("entity_type", "blog").eq("entity_id", blog_id).eq("locale", locale).eq("is_auto", true);
      await supabase.from("translations").insert(upserts);
    }

    return new Response(JSON.stringify({ translations, saved: upserts.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("translate-blog error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
