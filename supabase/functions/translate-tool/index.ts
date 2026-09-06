import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-provider.ts";
import { corsHeaders, requireEditor } from "../_shared/auth.ts";

const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  zh: "Chinese (Simplified)",
  ja: "Japanese",
  ko: "Korean",
  th: "Thai",
  id: "Indonesian (Bahasa Indonesia)",
  es: "Spanish",
  fr: "French",
  pt: "Portuguese (Brazilian)",
  de: "German",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Editors (incl. an AI content agent) may generate tool-content translations.
  const auth = await requireEditor(req);
  if (auth instanceof Response) return auth;

  try {
    const { tool_id, locale = "en" } = await req.json();
    if (!tool_id) {
      return new Response(JSON.stringify({ error: "tool_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetLang = LOCALE_NAMES[locale];
    if (!targetLang) {
      return new Response(JSON.stringify({ error: `Unsupported locale: ${locale}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = auth.supabase;

    const { data: tool, error: toolErr } = await supabase
      .from("tools")
      .select("id, name, short_description, description, detailed_content")
      .eq("id", tool_id)
      .maybeSingle();

    if (toolErr || !tool) {
      return new Response(JSON.stringify({ error: "Tool not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fields = [
      { field: "name", text: tool.name },
      { field: "short_description", text: tool.short_description },
      { field: "description", text: tool.description },
      { field: "detailed_content", text: tool.detailed_content },
    ].filter(f => f.text);

    const prompt = `Translate the following Vietnamese content about a tool called "${tool.name}" to ${targetLang}. Keep all HTML/Markdown formatting intact. Return a JSON object with the translated fields.

Fields to translate:
${fields.map(f => `- ${f.field}: """${(f.text || "").substring(0, 3000)}"""`).join("\n\n")}

Return ONLY a valid JSON object like:
{
  "name": "translated name",
  "short_description": "translated short description",
  "description": "translated description",
  "detailed_content": "translated detailed content"
}

Important: Preserve all HTML tags, Markdown formatting, URLs, and technical terms. Only translate human-readable text.`;

    const response = await callAI({
      feature: "translation",
      messages: [
        { role: "system", content: `You are a professional translator. Translate Vietnamese to ${targetLang} accurately while preserving all formatting.` },
        { role: "user", content: prompt },
      ],
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let translations: Record<string, string> = {};
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) translations = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error("Failed to parse AI translation response");
    }

    const upserts = Object.entries(translations)
      .filter(([_, v]) => v)
      .map(([field, text]) => ({
        entity_type: "tool",
        entity_id: tool_id,
        field_name: field,
        locale,
        translated_text: text,
        is_auto: true,
      }));

    if (upserts.length > 0) {
      await supabase
        .from("translations")
        .delete()
        .eq("entity_type", "tool")
        .eq("entity_id", tool_id)
        .eq("locale", locale)
        .eq("is_auto", true);

      const { error: insertErr } = await supabase
        .from("translations")
        .insert(upserts);

      if (insertErr) console.error("Failed to save translations:", insertErr);
    }

    return new Response(JSON.stringify({ translations, saved: upserts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-tool error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
