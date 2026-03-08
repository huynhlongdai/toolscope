import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WORD_COUNTS: Record<string, string> = {
  listicle: "1500-2500", comparison: "1800-3000", guide: "2000-3500", review: "1500-2500", news: "1000-1800",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, topic, type, content, title, tools_list, tool_name, tool_description, categories_list, primary_keyword } = body;

    let messages: { role: string; content: string }[] = [];

    if (action === "generate") {
      const typeMap: Record<string, string> = {
        listicle: "a listicle/top-N format article",
        comparison: "a detailed comparison article between tools",
        guide: "a comprehensive how-to guide",
        review: "a detailed review article",
        news: "a news/trend analysis article",
      };
      const wordCount = WORD_COUNTS[type] || "1500-2500";

      messages = [
        {
          role: "system",
          content: `You are an elite SEO content strategist and tech blogger. Write ${typeMap[type] || "a comprehensive article"} in HTML format.

## SEO TITLE RULES:
- Include the primary keyword within the first 3 words
- Use a power word (Ultimate, Best, Complete, Essential, Proven, Top, Expert, Definitive)
- Include a number if applicable (e.g. "7 Best...", "Top 10...")
- Length: 50-60 characters max
- Create curiosity or urgency

## CONTENT STRUCTURE RULES:
1. **Opening paragraph** (2-3 sentences): Start with a compelling hook. Include the primary keyword naturally within the first 100 words. State the value proposition clearly.

2. **H2 sections** (minimum 4-6): Each H2 should contain a secondary keyword or be phrased as a question (People Also Ask friendly). Examples: "What Is [Topic]?", "How Does [Tool] Compare to...", "Why [Topic] Matters in 2026"

3. **H3 subsections**: Use for detailed breakdowns under H2s. Include LSI keywords naturally.

4. **Paragraphs**: Keep short (2-3 sentences max). Use transition words (Furthermore, Additionally, However, In contrast, As a result).

5. **Lists**: Include at least 2 numbered or bullet lists (featured snippet friendly). Wrap in proper <ol> or <ul> tags.

6. **Image placeholders**: Insert 2-4 image placeholders using this exact format:
<figure data-image-suggestion="[describe what image should show]">
  <img src="" alt="[Descriptive alt text containing keyword] - ToolScope" loading="lazy" />
  <figcaption>[Brief caption explaining the image]</figcaption>
</figure>
Place images: after intro paragraph, mid-article, before conclusion.

7. **Internal link placeholders**: Insert 2-3 placeholders like: <a href="#" data-internal-link="[related topic]">[anchor text]</a>

8. **CTA blocks**: Include a mid-article CTA and end-of-article CTA using:
<div class="cta-block"><strong>[Action-oriented heading]</strong><p>[Brief compelling text]</p></div>

9. **FAQ section** at the end: Include 3-5 FAQs using this structure:
<div class="faq-section">
<h2>Frequently Asked Questions</h2>
<div class="faq-item"><h3>[Question containing keyword?]</h3><p>[Concise 2-3 sentence answer]</p></div>
</div>

10. **Content length**: ${wordCount} words minimum.

## HTML RULES:
- Use <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <figure>, <figcaption>
- Do NOT use <h1> (title is separate)
- Use <strong> for key terms (but don't over-optimize)
- Add <blockquote> for key takeaways or expert quotes

## KEYWORD RULES:
- Primary keyword density: 1-2% (natural, not stuffed)
- Include primary keyword in: first H2, one H3, first paragraph, last paragraph, one image alt text
- Use 3-5 secondary keywords spread across H2/H3 headings
- Use 5-8 LSI (semantically related) keywords throughout the body

## OUTPUT FORMAT:
Return ONLY valid JSON:
{
  "title": "SEO-optimized title (50-60 chars, keyword first, power word included)",
  "content": "<h2>...</h2><p>...</p>...",
  "excerpt": "Compelling 2-3 sentence summary optimized for social sharing (include keyword, create curiosity, 150-160 chars)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "seo_title": "SEO title with keyword | Brand (max 60 chars)",
  "seo_description": "Meta description starting with keyword, includes CTA, 150-160 chars",
  "seo_keywords": ["primary_keyword", "secondary1", "secondary2", "lsi1", "lsi2"],
  "primary_keyword": "main target keyword",
  "secondary_keywords": ["kw1", "kw2", "kw3"],
  "lsi_keywords": ["related1", "related2", "related3", "related4", "related5"],
  "search_intent": "informational|transactional|navigational|commercial",
  "reading_time_minutes": 8,
  "word_count": 2000
}`
        },
        { role: "user", content: `Write a comprehensive, SEO-optimized article about: ${topic}\n\nTarget audience: Tech professionals, marketers, and business owners looking for AI/SaaS tools.\nTone: Authoritative yet accessible. Data-driven with practical insights.` }
      ];
    } else if (action === "generate_seo") {
      messages = [
        {
          role: "system",
          content: `You are an expert SEO analyst. Analyze the content and generate optimized metadata.

## SEO TITLE RULES:
- Place primary keyword within first 3 words
- Add a power word (Ultimate, Best, Complete, Essential, Proven, Expert)
- Include number if content has lists
- Max 60 characters
- Format: "Primary Keyword: Power Word Description | Brand"

## META DESCRIPTION RULES:
- Start with primary keyword in first 30 characters
- Include a clear value proposition
- End with a CTA (Learn more, Discover, Find out, Compare)
- Exactly 150-160 characters
- Use active voice

## ANALYSIS:
- Identify the primary keyword (most important search term)
- Determine search intent (informational/transactional/navigational/commercial)
- Score content quality 1-100 based on: keyword usage, heading structure, content depth, readability, image presence, FAQ presence
- Provide specific improvement suggestions

Return ONLY valid JSON:
{
  "seo_title": "Keyword-first SEO title | Brand (max 60 chars)",
  "seo_description": "Keyword-starting meta description with CTA (150-160 chars)",
  "seo_keywords": ["primary_keyword", "secondary1", "secondary2", "lsi1", "lsi2", "lsi3"],
  "suggested_tags": ["tag1", "tag2", "tag3", "tag4"],
  "primary_keyword": "main keyword",
  "search_intent": "informational|transactional|navigational|commercial",
  "content_score": 75,
  "improvement_suggestions": [
    "Add the primary keyword to the first paragraph",
    "Include an FAQ section with 3-5 questions",
    "Add image alt texts containing the target keyword",
    "Shorten paragraphs to 2-3 sentences for better readability"
  ]
}`
        },
        { role: "user", content: `Title: ${title}\n\nContent:\n${content?.substring(0, 4000)}` }
      ];
    } else if (action === "generate_excerpt") {
      messages = [
        {
          role: "system",
          content: `Create a compelling excerpt/summary optimized for social sharing (Open Graph preview).
Rules:
- 2-3 sentences, 150-160 characters total
- Include the main keyword naturally in the first sentence
- Create curiosity or highlight the key benefit
- Use active voice
- End with an implicit CTA (makes reader want to click)
Return ONLY the summary text, no JSON.`
        },
        { role: "user", content: content?.substring(0, 3000) || "" }
      ];
    } else if (action === "suggest_tools") {
      messages = [
        { role: "system", content: `Match blog content to relevant tools. Return ONLY valid JSON: { "tool_ids": ["id1", "id2", ...] }. Select 3-8 most relevant tools.` },
        { role: "user", content: `Blog title: ${title}\n\nBlog content:\n${content?.substring(0, 2000)}\n\nAvailable tools:\n${tools_list || "[]"}` }
      ];
    } else if (action === "suggest_category") {
      messages = [
        { role: "system", content: `Given a tool and categories, suggest the best match. Return ONLY valid JSON: { "category_id": "id", "reason": "brief explanation" }` },
        { role: "user", content: `Tool: ${tool_name}\nDescription: ${tool_description}\n\nCategories:\n${categories_list || "[]"}` }
      ];
    } else if (action === "seo_audit") {
      messages = [
        {
          role: "system",
          content: `You are an expert SEO auditor. Analyze the provided blog content and return a comprehensive SEO audit.

Score each criterion 0-100 and provide specific, actionable suggestions.

## AUDIT CRITERIA:

1. **title_score**: Is the title 50-60 chars? Contains keyword? Has power word? Creates curiosity?
2. **meta_description_score**: Is it 150-160 chars? Starts with keyword? Has CTA?
3. **heading_structure_score**: Are H2/H3 used properly? Do headings contain keywords? Are they question-formatted?
4. **keyword_usage_score**: Is keyword density 1-2%? Is keyword in first paragraph, headings, alt text?
5. **content_depth_score**: Word count adequate? Comprehensive coverage? Has examples/data?
6. **readability_score**: Short paragraphs? Transition words? Lists present? Scannable?
7. **image_optimization_score**: Are there images? Do they have alt text? Are alt texts keyword-rich?
8. **internal_linking_score**: Are there internal link opportunities? Anchor text quality?
9. **faq_score**: Is there a FAQ section? Are questions keyword-relevant?
10. **cta_score**: Are there CTAs? Mid-article and end-of-article?

Return ONLY valid JSON:
{
  "overall_score": 72,
  "scores": {
    "title": { "score": 85, "status": "good", "detail": "Title is 58 chars, contains keyword" },
    "meta_description": { "score": 40, "status": "poor", "detail": "Missing meta description" },
    "heading_structure": { "score": 70, "status": "ok", "detail": "4 H2 tags found, but none are questions" },
    "keyword_usage": { "score": 65, "status": "ok", "detail": "Keyword found 3 times, density ~1.2%" },
    "content_depth": { "score": 80, "status": "good", "detail": "1800 words, good coverage" },
    "readability": { "score": 75, "status": "good", "detail": "Short paragraphs, has lists" },
    "image_optimization": { "score": 30, "status": "poor", "detail": "No images found" },
    "internal_linking": { "score": 20, "status": "poor", "detail": "No internal links" },
    "faq_section": { "score": 0, "status": "missing", "detail": "No FAQ section found" },
    "cta_presence": { "score": 50, "status": "ok", "detail": "1 CTA found at end" }
  },
  "top_suggestions": [
    "🔴 Add a meta description (150-160 chars) starting with your primary keyword",
    "🔴 Add 2-3 images with keyword-rich alt text",
    "🟡 Add an FAQ section with 3-5 questions containing target keywords",
    "🟡 Rephrase H2 headings as questions for People Also Ask optimization",
    "🟢 Consider adding internal links to related tool pages"
  ],
  "keyword_analysis": {
    "detected_primary": "AI design tools",
    "density_percent": 1.2,
    "appearances": { "title": true, "first_paragraph": true, "headings": false, "alt_text": false, "last_paragraph": true }
  }
}`
        },
        {
          role: "user",
          content: `Audit this blog post for SEO quality:

Title: ${title || "(no title)"}
SEO Title: ${body.seo_title || "(not set)"}
Meta Description: ${body.seo_description || "(not set)"}
Primary Keyword: ${primary_keyword || "(not specified)"}
Tags: ${Array.isArray(body.tags) ? body.tags.join(", ") : body.tags || "(none)"}

Content:
${content?.substring(0, 5000) || "(no content)"}`
        }
      ];
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await callAI({ feature: "content_generation", messages });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    let result: any;
    if (action === "generate_excerpt") {
      result = { excerpt: raw.trim() };
    } else {
      const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : raw;
      try { result = JSON.parse(jsonStr.trim()); }
      catch { return new Response(JSON.stringify({ error: "Failed to parse AI response", raw }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-blog-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
