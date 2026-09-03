import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-provider.ts";
import { corsHeaders, requireAdmin } from "../_shared/auth.ts";

const LOCALE_NAMES: Record<string, string> = {
  en: "English", zh: "Chinese (Simplified)", ja: "Japanese", ko: "Korean",
  th: "Thai", id: "Indonesian (Bahasa Indonesia)", es: "Spanish",
  fr: "French", pt: "Portuguese (Brazilian)", de: "German",
};

interface MenuItem {
  label: string;
  url: string;
  children?: MenuItem[];
}

function extractLabels(items: MenuItem[], prefix = "item"): { field: string; text: string }[] {
  const result: { field: string; text: string }[] = [];
  items.forEach((item, i) => {
    result.push({ field: `${prefix}_${i}_label`, text: item.label });
    if (item.children) {
      item.children.forEach((child, j) => {
        result.push({ field: `${prefix}_${i}_child_${j}_label`, text: child.label });
      });
    }
  });
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const { menu_id, locale = "en" } = await req.json();
    if (!menu_id) return new Response(JSON.stringify({ error: "menu_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const targetLang = LOCALE_NAMES[locale];
    if (!targetLang) return new Response(JSON.stringify({ error: `Unsupported locale: ${locale}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = auth.supabase;

    const { data: menu, error: menuErr } = await supabase
      .from("menus")
      .select("id, name, items")
      .eq("id", menu_id)
      .maybeSingle();

    if (menuErr || !menu) return new Response(JSON.stringify({ error: "Menu not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const items = (menu.items || []) as MenuItem[];
    const labels = extractLabels(items);
    if (labels.length === 0) return new Response(JSON.stringify({ translations: {}, saved: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const labelsObj: Record<string, string> = {};
    labels.forEach(l => { labelsObj[l.field] = l.text; });

    const prompt = `Translate these Vietnamese menu labels to ${targetLang}. Return a JSON object with the same keys and translated values.

${JSON.stringify(labelsObj, null, 2)}

Return ONLY a valid JSON object with the same keys and translated string values.`;

    const response = await callAI({
      feature: "translation",
      messages: [
        { role: "system", content: `You are a professional translator. Translate Vietnamese to ${targetLang}. Keep translations short and suitable for navigation menus.` },
        { role: "user", content: prompt },
      ],
    });

    if (!response.ok) throw new Error("AI gateway error");

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let translations: Record<string, string> = {};
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) translations = JSON.parse(jsonMatch[0]);
    } catch { throw new Error("Failed to parse AI translation response"); }

    const upserts = Object.entries(translations)
      .filter(([_, v]) => v)
      .map(([field, text]) => ({ entity_type: "menu", entity_id: menu_id, field_name: field, locale, translated_text: text, is_auto: true }));

    if (upserts.length > 0) {
      await supabase.from("translations").delete().eq("entity_type", "menu").eq("entity_id", menu_id).eq("locale", locale).eq("is_auto", true);
      await supabase.from("translations").insert(upserts);
    }

    return new Response(JSON.stringify({ translations, saved: upserts.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("translate-menu error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
