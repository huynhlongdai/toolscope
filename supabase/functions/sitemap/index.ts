import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://toolscope.app";

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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${BASE_URL}/tools</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${BASE_URL}/trending</loc><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>${BASE_URL}/blog</loc><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>${BASE_URL}/collections</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${BASE_URL}/workflows</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${BASE_URL}/compare</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>
  <url><loc>${BASE_URL}/leaderboard</loc><changefreq>daily</changefreq><priority>0.6</priority></url>
`;

    for (const t of tools) {
      xml += `  <url><loc>${BASE_URL}/tool/${t.slug}</loc><lastmod>${new Date(t.updated_at).toISOString().split("T")[0]}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    }

    for (const c of categories) {
      xml += `  <url><loc>${BASE_URL}/category/${c.slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>\n`;
    }

    for (const b of blogs) {
      xml += `  <url><loc>${BASE_URL}/blog/${b.slug}</loc><lastmod>${new Date(b.updated_at).toISOString().split("T")[0]}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    }

    for (const w of workflows) {
      xml += `  <url><loc>${BASE_URL}/workflow/${w.slug}</loc><lastmod>${new Date(w.updated_at).toISOString().split("T")[0]}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
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
