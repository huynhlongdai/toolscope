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

// Fixed UUID for system translations entity_id
const SYSTEM_ENTITY_ID = "00000000-0000-0000-0000-000000000001";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { keys, locale = "en" } = await req.json();
    // keys: Array<{ key: string, text: string }>
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return new Response(JSON.stringify({ error: "keys array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const targetLang = LOCALE_NAMES[locale];
    if (!targetLang) return new Response(JSON.stringify({ error: `Unsupported locale: ${locale}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Batch in chunks of 50
    const chunks: typeof keys[] = [];
    for (let i = 0; i < keys.length; i += 50) {
      chunks.push(keys.slice(i, i + 50));
    }

    const allTranslations: Record<string, string> = {};

    for (const chunk of chunks) {
      const keysObj: Record<string, string> = {};
      chunk.forEach((k: { key: string; text: string }) => { keysObj[k.key] = k.text; });

      const prompt = `Translate these Vietnamese UI strings to ${targetLang}. Return a JSON object with the same keys and translated values. Keep translations concise and appropriate for a web interface.

${JSON.stringify(keysObj, null, 2)}

Return ONLY a valid JSON object with the same keys and translated string values.`;

      const response = await callAI({
        feature: "translation",
        messages: [
          { role: "system", content: `You are a UI translator. Translate Vietnamese to ${targetLang}. Keep translations short and natural for UI elements.` },
          { role: "user", content: prompt },
        ],
      });

      if (!response.ok) throw new Error("AI gateway error");

      const aiData = await response.json();
      const rawContent = aiData.choices?.[0]?.message?.content || "";

      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          Object.assign(allTranslations, parsed);
        }
      } catch { console.warn("Failed to parse chunk"); }
    }

    // Save to DB
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const upserts = Object.entries(allTranslations)
      .filter(([_, v]) => v)
      .map(([key, text]) => ({
        entity_type: "system",
        entity_id: SYSTEM_ENTITY_ID,
        field_name: key,
        locale,
        translated_text: text,
        is_auto: true,
      }));

    if (upserts.length > 0) {
      // Delete existing auto translations for these keys
      const fieldNames = upserts.map(u => u.field_name);
      await supabase.from("translations")
        .delete()
        .eq("entity_type", "system")
        .eq("entity_id", SYSTEM_ENTITY_ID)
        .eq("locale", locale)
        .eq("is_auto", true)
        .in("field_name", fieldNames);

      await supabase.from("translations").insert(upserts);
    }

    return new Response(JSON.stringify({ translations: allTranslations, saved: upserts.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("translate-system-keys error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
