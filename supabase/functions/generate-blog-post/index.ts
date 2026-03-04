import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, topic, type, content, title, tools_list, tool_name, tool_description, categories_list } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let messages: { role: string; content: string }[] = [];

    if (action === "generate") {
      // Generate full blog post from topic
      const typeMap: Record<string, string> = {
        listicle: "a listicle/top-N format article",
        comparison: "a comparison article between tools",
        guide: "a comprehensive how-to guide",
        review: "a detailed review article",
        news: "a news/trend analysis article",
      };
      const articleType = typeMap[type] || "a comprehensive article";

      messages = [
        {
          role: "system",
          content: `You are an expert tech blogger and SEO specialist. Write ${articleType} in HTML format suitable for a rich text editor. 
Rules:
- Use proper HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>
- Do NOT use <h1> (the title is separate)
- Include at least 3-5 sections with H2 headings
- Write engaging, informative content (800-1500 words)
- Include practical tips, examples, pros/cons where relevant
- Write in a professional but approachable tone
- Return ONLY valid JSON with this structure:
{
  "title": "SEO-optimized title",
  "content": "<h2>...</h2><p>...</p>...",
  "excerpt": "2-3 sentence summary",
  "tags": ["tag1", "tag2", "tag3"],
  "seo_title": "Title for SEO (max 60 chars)",
  "seo_description": "Meta description (max 160 chars)",
  "seo_keywords": ["keyword1", "keyword2", "keyword3"]
}`
        },
        { role: "user", content: `Write an article about: ${topic}` }
      ];
    } else if (action === "generate_seo") {
      // Generate SEO metadata from existing content
      messages = [
        {
          role: "system",
          content: `You are an SEO specialist. Analyze the blog post and generate optimized SEO metadata.
Return ONLY valid JSON:
{
  "seo_title": "SEO title (max 60 chars, include primary keyword)",
  "seo_description": "Meta description (max 160 chars, compelling, include CTA)",
  "seo_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "suggested_tags": ["tag1", "tag2", "tag3"]
}`
        },
        { role: "user", content: `Title: ${title}\n\nContent:\n${content?.substring(0, 3000)}` }
      ];
    } else if (action === "generate_excerpt") {
      messages = [
        {
          role: "system",
          content: "Summarize the following blog post in 2-3 concise sentences. Return ONLY the summary text, no JSON."
        },
        { role: "user", content: content?.substring(0, 3000) || "" }
      ];
    } else if (action === "suggest_tools") {
      messages = [
        {
          role: "system",
          content: `You are an AI assistant that matches blog content to relevant tools.
Given a blog post and a list of available tools, select the most relevant tools.
Return ONLY valid JSON: { "tool_ids": ["id1", "id2", ...] }
Select 3-8 most relevant tools. Match based on topic, keywords, and context.`
        },
        {
          role: "user",
          content: `Blog title: ${title}\n\nBlog content (excerpt):\n${content?.substring(0, 2000)}\n\nAvailable tools:\n${tools_list || "[]"}`
        }
      ];
    } else if (action === "suggest_category") {
      messages = [
        {
          role: "system",
          content: `You are a categorization expert. Given a tool and available categories, suggest the best matching category.
Return ONLY valid JSON: { "category_id": "id", "reason": "brief explanation" }
If no good match, return: { "category_id": null, "suggested_name": "New Category Name", "reason": "explanation" }`
        },
        {
          role: "user",
          content: `Tool: ${tool_name}\nDescription: ${tool_description}\n\nCategories:\n${categories_list || "[]"}`
        }
      ];
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    let result: any;
    if (action === "generate_excerpt") {
      result = { excerpt: raw.trim() };
    } else {
      // Parse JSON from response (handle markdown code blocks)
      const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : raw;
      try {
        result = JSON.parse(jsonStr.trim());
      } catch {
        console.error("Failed to parse AI response:", raw);
        return new Response(JSON.stringify({ error: "Failed to parse AI response", raw }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-blog-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
