import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ScoreRequest {
  entity_type: string;   // tool, blog_post, deal, workflow
  entity_id?: string;    // specific entity or null for batch
  locale?: string;       // specific locale or null for all
  batch_size?: number;   // how many to score (default 10)
}

interface QualityIssue {
  type: string;      // grammar, accuracy, fluency, terminology, formatting
  detail: string;
}

interface ScoreResult {
  quality_score: number;
  issues: QualityIssue[];
  improved_text?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scoreTranslation(
  sourceText: string,
  translatedText: string,
  locale: string,
  fieldName: string,
  glossaryTerms: Record<string, string>,
): Promise<ScoreResult> {
  const glossaryContext = Object.keys(glossaryTerms).length > 0
    ? `\nGlossary terms that MUST be used:\n${Object.entries(glossaryTerms).map(([s, t]) => `  "${s}" → "${t}"`).join("\n")}`
    : "";

  const prompt = `You are a professional translation quality assessor. Score this translation from English to ${locale}.

Source (English): "${sourceText}"
Translation (${locale}): "${translatedText}"
Field: ${fieldName}
${glossaryContext}

Rate the translation quality on a scale of 1-10:
- 10: Perfect, native-level
- 8-9: Very good, minor style issues
- 6-7: Acceptable, some awkwardness
- 4-5: Poor, meaning partially lost
- 1-3: Unusable, wrong meaning

Check for these issue types: grammar, accuracy, fluency, terminology, formatting, glossary_violation

Respond in this exact JSON format:
{
  "quality_score": <1-10>,
  "issues": [{"type": "<issue_type>", "detail": "<brief description>"}],
  "improved_text": "<improved translation if score < 8, null if score >= 8>"
}`;

  const response = await callAI({
    feature: "translation",
    messages: [
      { role: "system", content: "You are a translation quality assessor. Return only valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 500,
  });

  const text = await response.text();
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { quality_score: 5, issues: [{ type: "parse_error", detail: "Could not parse AI response" }] };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      quality_score: Math.max(1, Math.min(10, parsed.quality_score || 5)),
      issues: parsed.issues || [],
      improved_text: parsed.improved_text || undefined,
    };
  } catch {
    return { quality_score: 5, issues: [{ type: "parse_error", detail: "Invalid JSON from AI" }] };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { entity_type, entity_id, locale, batch_size = 10 }: ScoreRequest = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Build query for translations to score
    let query = supabase
      .from("translations")
      .select("*")
      .eq("entity_type", entity_type || "tool")
      .order("created_at", { ascending: false })
      .limit(batch_size);

    if (entity_id) query = query.eq("entity_id", entity_id);
    if (locale) query = query.eq("locale", locale);

    // Prefer unscored translations
    query = query.or("quality_score.is.null,needs_review.eq.true");

    const { data: translations, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!translations || translations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No translations to score", scored: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: Array<{
      id: string;
      locale: string;
      field: string;
      score: number;
      issues_count: number;
    }> = [];

    for (const t of translations) {
      // Get glossary for this locale
      const { data: glossaryData } = await supabase
        .rpc("get_glossary_for_locale", { p_locale: t.locale });
      const glossary = glossaryData || {};

      // Get source text (English version)
      const { data: sourceData } = await supabase
        .from("translations")
        .select("translated_value")
        .eq("entity_type", t.entity_type)
        .eq("entity_id", t.entity_id)
        .eq("field_name", t.field_name)
        .eq("locale", "en")
        .single();

      const sourceText = sourceData?.translated_value || t.field_name;
      const translatedText = t.translated_value || "";

      if (!translatedText) continue;

      const scoreResult = await scoreTranslation(
        sourceText,
        translatedText,
        t.locale,
        t.field_name,
        glossary,
      );

      // Update translation record
      await supabase
        .from("translations")
        .update({
          quality_score: scoreResult.quality_score,
          needs_review: scoreResult.quality_score < 7,
          glossary_applied: Object.keys(glossary).length > 0,
        })
        .eq("id", t.id);

      // Insert quality log
      await supabase.from("translation_quality_log").insert({
        translation_id: t.id,
        entity_type: t.entity_type,
        entity_id: t.entity_id,
        locale: t.locale,
        field_name: t.field_name,
        quality_score: scoreResult.quality_score,
        issues: scoreResult.issues,
        suggestions: scoreResult.improved_text
          ? { improved_text: scoreResult.improved_text }
          : {},
        auto_scored: true,
      });

      results.push({
        id: t.id,
        locale: t.locale,
        field: t.field_name,
        score: scoreResult.quality_score,
        issues_count: scoreResult.issues.length,
      });

      // Throttle between scores
      await sleep(1000);
    }

    const avgScore =
      results.length > 0
        ? (results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(1)
        : "0";

    return new Response(
      JSON.stringify({
        scored: results.length,
        average_score: parseFloat(avgScore),
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
