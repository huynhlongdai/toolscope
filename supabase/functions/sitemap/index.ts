import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://toolscope.app";

// All supported locales — English is default (no prefix)
const ALL_LOCALES = ["en", "vi", "zh", "ja", "ko", "th", "id", "es", "fr", "pt", "de"];
const DEFAULT_LOCALE = "en";

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // robots.txt
  if (path.endsWith("/robots.txt") || url.searchParams.get("type") === "robots") {
    const robotsTxt = `User-agent: *
Allow: /

# AI Crawlers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;
    return new Response(robotsTxt, {
      headers: { "Content-Type": "text/plain", "Cache-Control": "public, max-age=3600" },
    });
  }

  // Sitemap XML
  try {
    const [toolsRes, categoriesRes, blogRes, workflowsRes] = await Promise.all([
      supabase.from("tools").select("slug, updated_at").eq("status", "published").order("updated_at", { ascending: false }),
      supabase.from("categories").select("slug"),
      supabase.from("blog_posts").select("slug, updated_at").eq("status", "published"),
      supabase.from("workflows").select("slug, updated_at").eq("status", "published"),
    ]);

    const tools = toolsRes.data || [];
    const categories = categoriesRes.data || [];
    const blogs = blogRes.data || [];
    const workflows = workflowsRes.data || [];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;

    /**
     * Adds a URL entry with hreflang alternates for all locales.
     * Default locale (en) → no prefix: /tools
     * Other locales → prefix: /vi/tools, /ja/tools
     */
    const addUrl = (pagePath: string, lastmod?: string, changefreq = "weekly", priority = "0.7") => {
      // Generate the default (English) URL
      const defaultUrl = `${BASE_URL}${pagePath}`;

      xml += `  <url>\n    <loc>${defaultUrl}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n`;

      // Hreflang alternates for all locales
      for (const locale of ALL_LOCALES) {
        const localeUrl = locale === DEFAULT_LOCALE
          ? `${BASE_URL}${pagePath}`
          : `${BASE_URL}/${locale}${pagePath === "/" ? "" : pagePath}`;
        xml += `    <xhtml:link rel="alternate" hreflang="${locale}" href="${localeUrl}" />\n`;
      }
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultUrl}" />\n`;
      xml += `  </url>\n`;

      // Also add entries for each non-default locale
      for (const locale of ALL_LOCALES) {
        if (locale === DEFAULT_LOCALE) continue;

        const localeUrl = `${BASE_URL}/${locale}${pagePath === "/" ? "" : pagePath}`;
        xml += `  <url>\n    <loc>${localeUrl}</loc>\n`;
        if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n`;

        // Same hreflang alternates
        for (const loc of ALL_LOCALES) {
          const altUrl = loc === DEFAULT_LOCALE
            ? `${BASE_URL}${pagePath}`
            : `${BASE_URL}/${loc}${pagePath === "/" ? "" : pagePath}`;
          xml += `    <xhtml:link rel="alternate" hreflang="${loc}" href="${altUrl}" />\n`;
        }
        xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultUrl}" />\n`;
        xml += `  </url>\n`;
      }
    };

    // Static pages
    addUrl("/", undefined, "daily", "1.0");
    addUrl("/tools", undefined, "daily", "0.9");
    addUrl("/trending", undefined, "daily", "0.8");
    addUrl("/blog", undefined, "daily", "0.8");
    addUrl("/collections", undefined, "weekly", "0.7");
    addUrl("/workflows", undefined, "weekly", "0.7");
    addUrl("/compare", undefined, "weekly", "0.6");
    addUrl("/leaderboard", undefined, "daily", "0.6");
    addUrl("/deals", undefined, "daily", "0.7");
    addUrl("/launches", undefined, "daily", "0.7");
    addUrl("/categories", undefined, "weekly", "0.7");

    for (const t of tools) {
      addUrl(`/tool/${t.slug}`, new Date(t.updated_at).toISOString().split("T")[0], "weekly", "0.8");
    }

    for (const c of categories) {
      addUrl(`/category/${c.slug}`, undefined, "weekly", "0.7");
    }

    for (const b of blogs) {
      addUrl(`/blog/${b.slug}`, new Date(b.updated_at).toISOString().split("T")[0], "monthly", "0.7");
    }

    for (const w of workflows) {
      addUrl(`/workflow/${w.slug}`, new Date(w.updated_at).toISOString().split("T")[0], "monthly", "0.6");
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
    });
  } catch (e) {
    console.error("sitemap error:", e);
    return new Response("Error generating sitemap", { status: 500 });
  }
});
