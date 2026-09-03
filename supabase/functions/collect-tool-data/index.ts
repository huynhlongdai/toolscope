import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAdmin } from "../_shared/auth.ts";

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

function getFaviconUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

function formatUrl(url: string): string {
  let formatted = url.trim();
  if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
    formatted = `https://${formatted}`;
  }
  return formatted;
}

async function searchByName(name: string): Promise<string | null> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return null;

  try {
    console.log("Searching for tool by name:", name);
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${name} official website tool software`,
        limit: 3,
      }),
    });

    if (!response.ok) {
      console.warn("Firecrawl search returned:", response.status);
      return null;
    }

    const data = await response.json();
    const results = data.data || [];
    if (results.length > 0 && results[0].url) {
      console.log("Found URL via search:", results[0].url);
      return results[0].url;
    }
    return null;
  } catch (err) {
    console.warn("Firecrawl search error:", err);
    return null;
  }
}

async function scrapeWithFirecrawl(url: string): Promise<{ content: string; branding: any } | null> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return null;

  try {
    console.log("Attempting Firecrawl scrape for:", url);
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links"],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      console.warn("Firecrawl returned:", response.status);
      return null;
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || "";
    const metadata = data.data?.metadata || data.metadata || {};
    const links = data.data?.links || data.links || [];

    const content = `Title: ${metadata.title || ""}
Description: ${metadata.description || ""}
OG Image: ${metadata.ogImage || metadata.og_image || ""}
Source: ${metadata.sourceURL || url}
Links found: ${links.length}
Content:
${markdown.slice(0, 5000)}`;

    return {
      content,
      branding: {
        logo: metadata.ogImage || metadata.og_image || null,
        title: metadata.title || "",
      },
    };
  } catch (err) {
    console.warn("Firecrawl error:", err);
    return null;
  }
}

async function scrapeWithFetch(url: string): Promise<{ content: string; branding: any }> {
  let pageContent = "";
  let ogImage = "";
  let pageTitle = "";

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ToolScope/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    if (response.ok) {
      const html = await response.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      pageTitle = titleMatch ? titleMatch[1].trim() : "";

      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
      const metaDesc = descMatch ? descMatch[1].trim() : "";

      const kwMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
      const metaKeywords = kwMatch ? kwMatch[1].trim() : "";

      const ogImgMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
      ogImage = ogImgMatch ? ogImgMatch[1].trim() : "";

      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      let bodyText = bodyMatch ? bodyMatch[1] : html;
      bodyText = bodyText
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3000);

      pageContent = `Title: ${pageTitle}
Meta Description: ${metaDesc}
Meta Keywords: ${metaKeywords}
OG Image: ${ogImage}
Body Text: ${bodyText}`;
    }
  } catch (err) {
    console.warn("Fetch fallback error:", err);
    pageContent = `Could not fetch page content from ${url}.`;
  }

  return {
    content: pageContent,
    branding: { logo: ogImage || null, title: pageTitle },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const { url, name, tool_id, save_to_db } = await req.json();
    if (!url && !name) {
      return new Response(JSON.stringify({ error: "url or name is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = auth.supabase;

    // Resolve URL: if only name provided, search for it
    let resolvedUrl = url ? formatUrl(url) : null;
    let searchedByName = false;

    if (!resolvedUrl && name) {
      resolvedUrl = await searchByName(name);
      searchedByName = true;
    }

    let scrapeResult: { content: string; branding: any };
    let scrapeMethod = "ai_only";
    let domain = "";
    let faviconUrl = "";

    if (resolvedUrl) {
      const formattedUrl = formatUrl(resolvedUrl);
      domain = extractDomain(formattedUrl);
      faviconUrl = getFaviconUrl(domain);
      resolvedUrl = formattedUrl;

      const firecrawlResult = await scrapeWithFirecrawl(formattedUrl);
      scrapeResult = firecrawlResult || await scrapeWithFetch(formattedUrl);
      scrapeMethod = firecrawlResult ? "firecrawl" : "fetch";
    } else {
      // No URL found, AI will generate from knowledge
      scrapeResult = {
        content: `Tool name: ${name}. No website found. Please generate information based on your knowledge about this tool/software.`,
        branding: { logo: null, title: name },
      };
    }

    console.log(`Scraped with: ${scrapeMethod}, searched by name: ${searchedByName}`);

    const prompt = `Analyze this website/tool and extract information for a tool/software directory. Return a JSON object.

${resolvedUrl ? `URL: ${resolvedUrl}\nDomain: ${domain}` : `Tool name: ${name}`}
Scrape method: ${scrapeMethod}

Page content:
${scrapeResult.content}

Return ONLY valid JSON (no markdown, no comments) with these fields:
{
  "name": "Tool name (string)",
  "slug": "url-friendly-slug (string, lowercase, hyphens)",
  "short_description": "Brief description in Vietnamese, max 100 chars",
  "description": "Detailed description in Vietnamese, 2-3 paragraphs",
  "detailed_content": "A comprehensive HTML article in Vietnamese about this tool. Include sections: <h2>Tổng quan</h2>, <h2>Tính năng chính</h2> (with <ul><li> list), <h2>Bảng giá</h2>, <h2>Đối tượng sử dụng</h2>, <h2>Ưu điểm và nhược điểm</h2> (split into two <h3> subsections with lists), <h2>Kết luận</h2>. Use proper HTML tags: h2, h3, p, ul, li, strong, em. No markdown. Make it informative and at least 500 words.",
  "pricing_type": "one of: free, freemium, paid, open_source, contact",
  "pricing_details": [{"name": "Plan name", "price": 0, "currency": "USD", "features": ["feature1", "feature2"]}],
  "features": ["feature1 in Vietnamese", "feature2", ...],
  "platforms": ["Web", "iOS", "Android", "Windows", "macOS", "Linux"],
  "category_suggestion": "suggested category name in Vietnamese",
  "website_url": "${resolvedUrl || ""}",
  "logo_url": "best logo URL found, or null",
  "tags": ["tag1", "tag2", ...],
  "faq": [{"question": "Câu hỏi thường gặp về tool bằng tiếng Việt?", "answer": "Câu trả lời chi tiết 2-4 câu."}],
  "has_free_trial": "boolean - whether the tool offers a free trial",
  "trial_days": "number or null - how many days the free trial lasts (e.g. 7, 14, 30)",
  "requires_card": "boolean or null - whether a credit card is required for free trial or signup",
  "signup_options": ["array of strings from: free_signup, google_sso, github_sso, email_only, demo_request, apple_sso"]
}

IMPORTANT: Generate 5-8 FAQ items in Vietnamese. Each question must end with "?".`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a tool/software analyst. Extract accurate information from websites. Always respond with valid JSON only. Write descriptions and detailed_content in Vietnamese. For detailed_content, write proper HTML (not markdown)." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let rawContent = aiData.choices?.[0]?.message?.content || "{}";
    rawContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let toolData: any;
    try {
      toolData = JSON.parse(rawContent);
    } catch {
      console.error("Failed to parse AI response:", rawContent);
      toolData = {
        name: scrapeResult.branding?.title || name || domain,
        slug: (name || domain || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        short_description: `Công cụ từ ${domain || name}`,
        description: null,
        pricing_type: "contact",
        website_url: resolvedUrl || "",
      };
    }

    // Logo priority: AI found > Firecrawl branding > Google Favicon
    if (!toolData.logo_url && scrapeResult.branding?.logo) {
      toolData.logo_url = scrapeResult.branding.logo;
    }
    if (!toolData.logo_url && faviconUrl) {
      toolData.logo_url = faviconUrl;
    }

    // Ensure website_url
    if (!toolData.website_url && resolvedUrl) {
      toolData.website_url = resolvedUrl;
    }

    // Save to DB if requested
    if (save_to_db && tool_id) {
      const updateData: any = {
        website_url: toolData.website_url || resolvedUrl,
        logo_url: toolData.logo_url,
      };
      if (toolData.short_description) updateData.short_description = toolData.short_description;
      if (toolData.description) updateData.description = toolData.description;
      if (toolData.detailed_content) updateData.detailed_content = toolData.detailed_content;
      if (toolData.features) updateData.features = toolData.features;
      if (toolData.platforms) updateData.platforms = toolData.platforms;
      if (toolData.pricing_details) updateData.pricing_details = toolData.pricing_details;
      if (toolData.faq) updateData.faq = toolData.faq;
      if (toolData.has_free_trial != null) updateData.has_free_trial = toolData.has_free_trial;
      if (toolData.trial_days != null) updateData.trial_days = toolData.trial_days;
      if (toolData.requires_card != null) updateData.requires_card = toolData.requires_card;
      if (Array.isArray(toolData.signup_options)) updateData.signup_options = toolData.signup_options;

      const { error: updateErr } = await supabase.from("tools").update(updateData).eq("id", tool_id);
      if (updateErr) console.error("Failed to update tool:", updateErr);
      toolData.saved = !updateErr;
    } else if (save_to_db && !tool_id) {
      const { data: newTool, error: insertErr } = await supabase
        .from("tools")
        .insert({
          name: toolData.name,
          slug: toolData.slug,
          short_description: toolData.short_description,
          description: toolData.description,
          detailed_content: toolData.detailed_content,
          website_url: toolData.website_url || resolvedUrl,
          logo_url: toolData.logo_url,
          pricing_type: toolData.pricing_type || "contact",
          features: toolData.features,
          platforms: toolData.platforms || [],
          pricing_details: toolData.pricing_details,
          faq: toolData.faq || null,
          has_free_trial: toolData.has_free_trial ?? false,
          trial_days: toolData.trial_days ?? null,
          requires_card: toolData.requires_card ?? null,
          signup_options: toolData.signup_options ?? [],
          status: "pending_review",
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Failed to create tool:", insertErr);
        toolData.saved = false;
        toolData.save_error = insertErr.message;
      } else {
        toolData.saved = true;
        toolData.tool_id = newTool?.id;
      }
    }

    toolData.favicon_url = faviconUrl;
    toolData.scrape_method = scrapeMethod;
    toolData.searched_by_name = searchedByName;

    return new Response(JSON.stringify(toolData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("collect-tool-data error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
