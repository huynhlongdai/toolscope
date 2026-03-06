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
    const { tool_id, locale = "en" } = await req.json();
    if (!tool_id) {
      return new Response(JSON.stringify({ error: "tool_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LOVABLE_API_KEY checked by callAI as fallback

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    const prompt = `Translate the following Vietnamese content about a tool called "${tool.name}" to English. Keep all HTML/Markdown formatting intact. Return a JSON object with the translated fields.

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional translator. Translate Vietnamese to English accurately while preserving all formatting." },
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
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let translations: Record<string, string> = {};
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) translations = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error("Failed to parse AI translation response");
    }

    // Upsert translations into translations table
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
      // Delete existing auto translations for this tool+locale
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
