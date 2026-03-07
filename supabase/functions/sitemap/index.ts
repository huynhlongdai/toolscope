import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://toolscope.app";
const LOCALES = ["vi", "en"];

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

    // Helper to add URL with hreflang alternates
    const addUrl = (path: string, lastmod?: string, changefreq = "weekly", priority = "0.7") => {
      xml += `  <url>\n    <loc>${BASE_URL}${path}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n`;
      // Add hreflang for each locale pointing to same URL (content switches via locale toggle)
      for (const locale of LOCALES) {
        xml += `    <xhtml:link rel="alternate" hreflang="${locale}" href="${BASE_URL}${path}" />\n`;
      }
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}${path}" />\n`;
      xml += `  </url>\n`;
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
