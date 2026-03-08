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
    const { blog_id, workflow_id, deal_id, locale = "en" } = await req.json();
    const entityId = deal_id || blog_id || workflow_id;
    const entityType = deal_id ? "deal" : workflow_id ? "workflow" : "blog";
    const tableName = deal_id ? "deals" : workflow_id ? "workflows" : "blog_posts";

    if (!entityId) return new Response(JSON.stringify({ error: "blog_id, workflow_id or deal_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const targetLang = LOCALE_NAMES[locale];
    if (!targetLang) return new Response(JSON.stringify({ error: `Unsupported locale: ${locale}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const selectFields = entityType === "deal"
      ? "id, title, description"
      : entityType === "workflow"
      ? "id, title, description, seo_title, seo_description, seo_content, steps"
      : "id, title, excerpt, content";

    const { data: entity, error: entityErr } = await supabase
      .from(tableName)
      .select(selectFields)
      .eq("id", entityId)
      .maybeSingle();

    if (entityErr || !entity) return new Response(JSON.stringify({ error: `${entityType} not found` }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const fieldEntries: { field: string; text: string }[] = [];

    if (entityType === "workflow") {
      const e = entity as any;
      if (e.title) fieldEntries.push({ field: "title", text: e.title });
      if (e.description) fieldEntries.push({ field: "description", text: e.description });
      if (e.seo_title) fieldEntries.push({ field: "seo_title", text: e.seo_title });
      if (e.seo_description) fieldEntries.push({ field: "seo_description", text: e.seo_description });

      // seo_content fields
      const seo = e.seo_content || {};
      if (seo.problem) fieldEntries.push({ field: "seo_content_problem", text: seo.problem });
      if (seo.solution) fieldEntries.push({ field: "seo_content_solution", text: seo.solution });
      if (seo.target_audience) fieldEntries.push({ field: "seo_content_target_audience", text: seo.target_audience });

      // steps
      const steps = (e.steps as any[]) || [];
      steps.forEach((step: any, i: number) => {
        if (step.title) fieldEntries.push({ field: `step_${i}_title`, text: step.title });
        if (step.description) fieldEntries.push({ field: `step_${i}_description`, text: step.description });
      });
    } else {
      const e = entity as any;
      if (e.title) fieldEntries.push({ field: "title", text: e.title });
      if (e.excerpt) fieldEntries.push({ field: "excerpt", text: e.excerpt });
      if (e.content) fieldEntries.push({ field: "content", text: e.content.substring(0, 8000) });
    }

    if (fieldEntries.length === 0) {
      return new Response(JSON.stringify({ translations: {}, saved: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Translate the following Vietnamese ${entityType} content to ${targetLang}. Keep all HTML/Markdown formatting intact. Return a JSON object with the translated fields.

Fields to translate:
${fieldEntries.map(f => `- ${f.field}: """${f.text}"""`).join("\n\n")}

Return ONLY a valid JSON object like:
{ ${fieldEntries.map(f => `"${f.field}": "..."`).join(", ")} }

Important: Preserve all HTML tags, Markdown formatting, URLs. Only translate human-readable text.`;

    const response = await callAI({
      feature: "translation",
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
      .map(([field, text]) => ({ entity_type: entityType, entity_id: entityId, field_name: field, locale, translated_text: text, is_auto: true }));

    if (upserts.length > 0) {
      await supabase.from("translations").delete().eq("entity_type", entityType).eq("entity_id", entityId).eq("locale", locale).eq("is_auto", true);
      await supabase.from("translations").insert(upserts);
    }

    return new Response(JSON.stringify({ translations, saved: upserts.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("translate-blog error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
