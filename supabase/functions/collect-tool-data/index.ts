import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

// Try Firecrawl first for deep scraping
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

// Fallback: basic fetch + HTML parse
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

  try {
    const { url, tool_id, save_to_db } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const formattedUrl = formatUrl(url);
    const domain = extractDomain(formattedUrl);
    const faviconUrl = getFaviconUrl(domain);

    // Try Firecrawl first, fallback to basic fetch
    const firecrawlResult = await scrapeWithFirecrawl(formattedUrl);
    const scrapeResult = firecrawlResult || await scrapeWithFetch(formattedUrl);
    const scrapeMethod = firecrawlResult ? "firecrawl" : "fetch";

    console.log(`Scraped with: ${scrapeMethod}`);

    // Use AI to extract structured tool data
    const prompt = `Analyze this website and extract information for a tool/software directory. Return a JSON object.

URL: ${formattedUrl}
Domain: ${domain}
Scrape method: ${scrapeMethod}

Page content:
${scrapeResult.content}

Return ONLY valid JSON (no markdown, no comments) with these fields:
{
  "name": "Tool name (string)",
  "slug": "url-friendly-slug (string, lowercase, hyphens)",
  "short_description": "Brief description in Vietnamese, max 100 chars",
  "description": "Detailed description in Vietnamese, 2-3 paragraphs",
  "pricing_type": "one of: free, freemium, paid, open_source, contact",
  "pricing_details": {"plans": [{"name": "...", "price": "...", "features": ["..."]}]},
  "features": ["feature1", "feature2", ...],
  "platforms": ["web", "ios", "android", "windows", "mac", "linux"],
  "category_suggestion": "suggested category name in Vietnamese",
  "website_url": "${formattedUrl}",
  "logo_url": "best logo URL found, or null",
  "tags": ["tag1", "tag2", ...]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a tool/software analyst. Extract accurate information from websites. Always respond with valid JSON only. Write descriptions in Vietnamese." },
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
        name: scrapeResult.branding?.title || domain,
        slug: domain.replace(/\./g, "-").replace(/^www-/, ""),
        short_description: `Công cụ từ ${domain}`,
        description: null,
        pricing_type: "contact",
        website_url: formattedUrl,
      };
    }

    // Logo priority: AI found > Firecrawl branding > Google Favicon
    if (!toolData.logo_url && scrapeResult.branding?.logo) {
      toolData.logo_url = scrapeResult.branding.logo;
    }
    if (!toolData.logo_url) {
      toolData.logo_url = faviconUrl;
    }

    // Save to DB if requested
    if (save_to_db && tool_id) {
      const updateData: any = {
        website_url: toolData.website_url || formattedUrl,
        logo_url: toolData.logo_url,
      };
      if (toolData.short_description) updateData.short_description = toolData.short_description;
      if (toolData.description) updateData.description = toolData.description;
      if (toolData.features) updateData.features = toolData.features;
      if (toolData.platforms) updateData.platforms = toolData.platforms;
      if (toolData.pricing_details) updateData.pricing_details = toolData.pricing_details;

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
          website_url: toolData.website_url || formattedUrl,
          logo_url: toolData.logo_url,
          pricing_type: toolData.pricing_type || "contact",
          features: toolData.features,
          platforms: toolData.platforms || [],
          pricing_details: toolData.pricing_details,
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
