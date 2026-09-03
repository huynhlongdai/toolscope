import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireAdmin } from "../_shared/auth.ts";

function formatUrl(url: string): string {
  let f = url.trim();
  if (!f.startsWith("http://") && !f.startsWith("https://")) f = `https://${f}`;
  return f;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

// Search tools by keyword using Firecrawl search, with AI fallback
async function searchByKeyword(keyword: string, limit = 20): Promise<{ results: any[]; source: string }> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  
  if (apiKey) {
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: `${keyword} tool software app SaaS`, limit }),
      });

      if (response.ok) {
        const data = await response.json();
        return { results: data.data || [], source: "firecrawl" };
      }
      console.warn(`Firecrawl search returned ${response.status}, falling back to AI search`);
    } catch (e) {
      console.warn("Firecrawl search error, falling back to AI:", e);
    }
  }

  const results = await searchByAI(keyword, limit);
  return { results, source: "ai_fallback" };
}

// AI-based fallback search
async function searchByAI(keyword: string, limit = 20): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const prompt = `List ${limit} popular and real software tools/apps/SaaS products related to "${keyword}".
For each tool, provide:
- title: the tool name
- url: the official website URL
- description: a brief description

Return ONLY a valid JSON array: [{"title":"...","url":"...","description":"..."}]
Only include real, existing tools. No fictional products.`;

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a software tools expert. Respond with valid JSON array only." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!aiResp.ok) throw new Error(`AI search fallback failed: ${aiResp.status}`);
  const aiData = await aiResp.json();
  let raw = aiData.choices?.[0]?.message?.content || "[]";
  raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("Failed to parse AI search results");
    return [];
  }
}

// Scrape a listing URL to extract tools
async function scrapeListingUrl(url: string): Promise<string> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  
  if (apiKey) {
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: formatUrl(url), formats: ["markdown"], onlyMainContent: true, waitFor: 3000 }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.data?.markdown || data.markdown || "";
      }
      console.warn(`Firecrawl scrape returned ${response.status}, returning empty`);
    } catch (e) {
      console.warn("Firecrawl scrape error:", e);
    }
  }

  return `Unable to scrape. URL: ${url}. Please use your knowledge about this website to extract tool information.`;
}

// Use AI to parse content into tool items
async function parseToolsWithAI(content: string, searchType: string, query: string, categoryHint?: string): Promise<any[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  let prompt: string;
  if (searchType === "keyword") {
    prompt = `From these search results about "${query}", extract a list of distinct software tools/apps/SaaS products found.
${categoryHint ? `Category context: ${categoryHint}` : ""}

Search results:
${content.slice(0, 8000)}

Return ONLY a JSON array of tools. Each tool object:
{
  "name": "Tool name",
  "website_url": "https://...",
  "description": "Brief description in Vietnamese",
  "pricing_type": "free|freemium|paid|open_source|contact",
  "category_name": "suggested category in Vietnamese",
  "source_url": "URL where this was found"
}

Deduplicate by domain. Only include actual software tools, not blog posts or articles. Max 30 items.`;
  } else if (searchType === "content") {
    prompt = `From this text content, extract ALL software tools/apps/SaaS products mentioned.
${categoryHint ? `Category context: ${categoryHint}` : ""}

Content:
${content.slice(0, 12000)}

Return ONLY a JSON array of tools. Each tool object:
{
  "name": "Tool name",
  "website_url": "https://... (if mentioned, otherwise null)",
  "description": "Brief description in Vietnamese based on what's mentioned",
  "pricing_type": "free|freemium|paid|open_source|contact",
  "category_name": "suggested category in Vietnamese",
  "source_url": null
}

Only include actual software tools/apps/SaaS. Max 50 items.`;
  } else {
    prompt = `From this scraped page content of "${query}", extract all software tools/apps listed.
${categoryHint ? `Category context: ${categoryHint}` : ""}

Page content:
${content.slice(0, 10000)}

Return ONLY a JSON array of tools. Each tool object:
{
  "name": "Tool name",
  "website_url": "https://...",
  "description": "Brief description in Vietnamese",
  "pricing_type": "free|freemium|paid|open_source|contact",
  "category_name": "suggested category in Vietnamese",
  "source_url": "${query}"
}

Only include actual software tools. Max 50 items.`;
  }

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You extract software tool information from web content. Always respond with a valid JSON array only, no markdown." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!aiResponse.ok) {
    if (aiResponse.status === 429) throw new Error("Rate limit exceeded. Please try again later.");
    if (aiResponse.status === 402) throw new Error("AI credits exhausted. Please add credits.");
    throw new Error(`AI gateway error: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  let raw = aiData.choices?.[0]?.message?.content || "[]";
  raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("Failed to parse AI tools list:", raw.slice(0, 200));
    return [];
  }
}

// Read file content from storage bucket
async function readFileFromStorage(supabase: any, filePath: string, fileType: string): Promise<string> {
  const { data, error } = await supabase.storage.from("collect-uploads").download(filePath);
  if (error) throw new Error(`File download error: ${error.message}`);

  const ext = fileType?.toLowerCase() || filePath.split(".").pop()?.toLowerCase() || "";

  if (["txt", "md", "csv", "markdown"].includes(ext)) {
    return await data.text();
  }

  if (ext === "pdf") {
    // For PDF: convert to base64 and use Gemini vision to extract text
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const arrayBuffer = await data.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Extract all text content from this PDF document. Return the raw text content only." },
          { role: "user", content: [
            { type: "text", text: "Extract all text from this PDF document:" },
            { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
          ]},
        ],
      }),
    });

    if (!aiResp.ok) throw new Error(`PDF extraction failed: ${aiResp.status}`);
    const aiData = await aiResp.json();
    return aiData.choices?.[0]?.message?.content || "";
  }

  if (["xlsx", "xls"].includes(ext)) {
    // For Excel: read as text (limited support - best effort)
    const text = await data.text();
    return text || "Excel file content - please extract tool names from tabular data";
  }

  return await data.text();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json();
    const { action, query, search_type, category_id, category_name, session_id, item_ids, item_id, target_category_id, content_text, file_path, file_type } = body;

    const supabase = auth.supabase;
    const userId: string = auth.user.id;

    if (action === "search") {
      if (!query) throw new Error("query is required");
      const type = search_type || "keyword";

      let content = "";
      let dataSource = "firecrawl";
      if (type === "keyword") {
        const { results, source } = await searchByKeyword(query);
        dataSource = source;
        content = results.map(r => `Title: ${r.title || ""}\nURL: ${r.url || ""}\nDescription: ${r.description || ""}\n---`).join("\n");
      } else {
        content = await scrapeListingUrl(query);
        dataSource = content.startsWith("Unable to scrape") ? "ai_fallback" : "firecrawl";
      }

      const tools = await parseToolsWithAI(content, type, query, category_name);

      const { data: session, error: sessionErr } = await supabase
        .from("collect_sessions")
        .insert({
          search_type: type,
          query,
          category_id: category_id || null,
          results_count: tools.length,
          status: "completed",
          created_by: userId || "00000000-0000-0000-0000-000000000000",
          metadata: { category_name, data_source: dataSource },
        })
        .select("id")
        .single();

      if (sessionErr) throw new Error(`Session save error: ${sessionErr.message}`);

      if (tools.length > 0) {
        const items = tools.map((t: any) => ({
          session_id: session.id,
          name: t.name || "Unknown",
          website_url: t.website_url || null,
          description: t.description || null,
          pricing_type: t.pricing_type || "contact",
          category_name: t.category_name || category_name || null,
          source_url: t.source_url || null,
          collected_data: { ...t, data_source: dataSource },
          status: "pending",
        }));

        const { error: itemsErr } = await supabase.from("collect_items").insert(items);
        if (itemsErr) console.error("Items insert error:", itemsErr);
      }

      return new Response(JSON.stringify({ 
        session_id: session.id, 
        tools_count: tools.length,
        data_source: dataSource,
        tools: tools.slice(0, 5),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "parse-content") {
      // === PARSE TEXT CONTENT OR UPLOADED FILE ===
      let textContent = "";

      if (content_text) {
        textContent = content_text;
      } else if (file_path) {
        textContent = await readFileFromStorage(supabase, file_path, file_type);
      } else {
        throw new Error("content_text or file_path is required");
      }

      if (!textContent || textContent.trim().length < 10) {
        throw new Error("Content too short to analyze");
      }

      const tools = await parseToolsWithAI(textContent, "content", "text/file input", category_name);

      const queryLabel = content_text 
        ? `[Text] ${content_text.slice(0, 80)}...` 
        : `[File] ${file_path}`;

      const { data: session, error: sessionErr } = await supabase
        .from("collect_sessions")
        .insert({
          search_type: "content",
          query: queryLabel,
          category_id: category_id || null,
          results_count: tools.length,
          status: "completed",
          created_by: userId || "00000000-0000-0000-0000-000000000000",
          metadata: { category_name, data_source: "content_parse", file_type: file_type || "text" },
        })
        .select("id")
        .single();

      if (sessionErr) throw new Error(`Session save error: ${sessionErr.message}`);

      if (tools.length > 0) {
        const items = tools.map((t: any) => ({
          session_id: session.id,
          name: t.name || "Unknown",
          website_url: t.website_url || null,
          description: t.description || null,
          pricing_type: t.pricing_type || "contact",
          category_name: t.category_name || category_name || null,
          source_url: t.source_url || null,
          collected_data: { ...t, data_source: "content_parse" },
          status: "pending",
        }));

        const { error: itemsErr } = await supabase.from("collect_items").insert(items);
        if (itemsErr) console.error("Items insert error:", itemsErr);
      }

      // Clean up uploaded file if exists
      if (file_path) {
        await supabase.storage.from("collect-uploads").remove([file_path]).catch(() => {});
      }

      return new Response(JSON.stringify({ 
        session_id: session.id, 
        tools_count: tools.length,
        data_source: "content_parse",
        tools: tools.slice(0, 5),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import") {
      if (!item_ids?.length) throw new Error("item_ids required");

      // Fetch all categories for matching
      const { data: allCategories } = await supabase
        .from("categories")
        .select("id, name, slug");
      const categoriesList = allCategories || [];

      const { data: items, error: fetchErr } = await supabase
        .from("collect_items")
        .select("*")
        .in("id", item_ids)
        .eq("status", "approved");

      if (fetchErr) throw new Error(fetchErr.message);
      if (!items?.length) throw new Error("No approved items found");

      // Per-item category overrides from request body
      const itemCategoryOverrides: Record<string, string> = body.item_category_overrides || {};

      const results: any[] = [];

      for (const item of items) {
        const slug = (item.name || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 100);
        
        const { data: existing } = await supabase
          .from("tools")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (existing) {
          results.push({ id: item.id, name: item.name, status: "duplicate", tool_id: existing.id });
          await supabase.from("collect_items").update({ status: "imported", imported_tool_id: existing.id }).eq("id", item.id);
          continue;
        }

        // Determine category_id: override > auto-match > target_category_id
        let resolvedCategoryId = target_category_id || null;
        let matchSource = "fallback";

        if (itemCategoryOverrides[item.id]) {
          resolvedCategoryId = itemCategoryOverrides[item.id];
          matchSource = "override";
        } else if (item.category_name) {
          const catName = item.category_name.trim().toLowerCase();
          const catSlug = catName.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          
          const matched = categoriesList.find((c: any) => 
            c.name.toLowerCase() === catName || c.slug === catSlug
          );

          if (matched) {
            resolvedCategoryId = matched.id;
            matchSource = "auto_match";
          }
        }

        const { data: newTool, error: insertErr } = await supabase
          .from("tools")
          .insert({
            name: item.name,
            slug,
            short_description: item.description?.slice(0, 100) || null,
            description: item.description,
            website_url: item.website_url,
            logo_url: item.logo_url || (item.website_url ? `https://www.google.com/s2/favicons?domain=${extractDomain(item.website_url)}&sz=128` : null),
            pricing_type: ["free", "freemium", "paid", "open_source", "contact"].includes(item.pricing_type) ? item.pricing_type : "contact",
            category_id: resolvedCategoryId,
            status: "pending_review",
          })
          .select("id")
          .single();

        if (insertErr) {
          results.push({ id: item.id, name: item.name, status: "error", error: insertErr.message });
        } else {
          await supabase.from("collect_items").update({ 
            status: "imported", 
            imported_tool_id: newTool.id,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
          }).eq("id", item.id);
          results.push({ id: item.id, name: item.name, status: "imported", tool_id: newTool.id, category_match: matchSource });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "enrich") {
      if (!item_id) throw new Error("item_id required");

      const { data: item } = await supabase.from("collect_items").select("*").eq("id", item_id).single();
      if (!item) throw new Error("Item not found");

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      let scrapeContent = "";
      if (item.website_url) {
        try { scrapeContent = (await scrapeListingUrl(item.website_url)).slice(0, 5000); } catch { scrapeContent = ""; }
      }

      const enrichPrompt = `Analyze this tool and provide enriched data:
Name: ${item.name}
URL: ${item.website_url || "unknown"}
Current description: ${item.description || "none"}
${scrapeContent ? `Website content:\n${scrapeContent}` : ""}

Return ONLY valid JSON:
{
  "description": "Detailed description in Vietnamese, 2-3 paragraphs",
  "short_description": "Brief, max 100 chars, Vietnamese",
  "pricing_type": "free|freemium|paid|open_source|contact",
  "logo_url": "best logo URL or null",
  "category_name": "suggested category in Vietnamese"
}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Extract tool info. Respond with valid JSON only." },
            { role: "user", content: enrichPrompt },
          ],
        }),
      });

      if (!aiResp.ok) throw new Error(`AI error: ${aiResp.status}`);
      const aiData = await aiResp.json();
      let raw = aiData.choices?.[0]?.message?.content || "{}";
      raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      let enriched: any = {};
      try { enriched = JSON.parse(raw); } catch {}

      await supabase.from("collect_items").update({
        description: enriched.description || item.description,
        logo_url: enriched.logo_url || item.logo_url,
        pricing_type: enriched.pricing_type || item.pricing_type,
        category_name: enriched.category_name || item.category_name,
        collected_data: { ...((item.collected_data as any) || {}), enriched },
      }).eq("id", item_id);

      return new Response(JSON.stringify({ success: true, enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "batch-enrich") {
      const limit = 20;
      const { data: pendingItems, error: fetchErr } = await supabase
        .from("collect_items")
        .select("id, name, website_url, description")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(limit);

      if (fetchErr) throw new Error(fetchErr.message);
      if (!pendingItems?.length) {
        return new Response(JSON.stringify({ success: true, enriched_count: 0, message: "No pending items" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      let enrichedCount = 0;
      const errors: string[] = [];

      for (const item of pendingItems) {
        try {
          let scrapeContent = "";
          if (item.website_url) {
            try { scrapeContent = (await scrapeListingUrl(item.website_url)).slice(0, 3000); } catch {}
          }

          const prompt = `Analyze: ${item.name}\nURL: ${item.website_url || "unknown"}\nDesc: ${item.description || "none"}\n${scrapeContent ? `Content:\n${scrapeContent}` : ""}\n\nReturn JSON: {"description":"Vietnamese 2-3 paragraphs","short_description":"max 100 chars Vietnamese","pricing_type":"free|freemium|paid|open_source|contact","logo_url":"URL or null","category_name":"Vietnamese category"}`;

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "Extract tool info. Valid JSON only." },
                { role: "user", content: prompt },
              ],
            }),
          });

          if (!aiResp.ok) {
            if (aiResp.status === 429) { errors.push(`Rate limited at item ${enrichedCount}`); break; }
            errors.push(`${item.name}: AI ${aiResp.status}`);
            continue;
          }

          let raw = (await aiResp.json()).choices?.[0]?.message?.content || "{}";
          raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          let enriched: any = {};
          try { enriched = JSON.parse(raw); } catch { continue; }

          await supabase.from("collect_items").update({
            description: enriched.description || item.description,
            logo_url: enriched.logo_url,
            pricing_type: enriched.pricing_type,
            category_name: enriched.category_name,
            collected_data: { enriched },
          }).eq("id", item.id);

          enrichedCount++;
          await new Promise(r => setTimeout(r, 500));
        } catch (e: any) {
          errors.push(`${item.name}: ${e.message}`);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        enriched_count: enrichedCount, 
        total: pendingItems.length,
        errors: errors.length > 0 ? errors : undefined,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "run-schedule") {
      const schedule_id = body.schedule_id;
      
      const { data: schedule } = await supabase
        .from("collect_schedules")
        .select("*")
        .eq("id", schedule_id || "")
        .single();

      if (!schedule) throw new Error("Schedule not found");

      const type = schedule.search_type || "keyword";
      let content = "";
      let dataSource = "firecrawl";
      if (type === "keyword") {
        const { results, source } = await searchByKeyword(schedule.keyword);
        dataSource = source;
        content = results.map((r: any) => `Title: ${r.title || ""}\nURL: ${r.url || ""}\nDescription: ${r.description || ""}\n---`).join("\n");
      } else {
        content = await scrapeListingUrl(schedule.keyword);
        dataSource = content.startsWith("Unable to scrape") ? "ai_fallback" : "firecrawl";
      }

      let catName = "";
      if (schedule.category_id) {
        const { data: cat } = await supabase.from("categories").select("name").eq("id", schedule.category_id).single();
        catName = cat?.name || "";
      }

      const tools = await parseToolsWithAI(content, type, schedule.keyword, catName);

      const { data: session } = await supabase
        .from("collect_sessions")
        .insert({
          search_type: type,
          query: schedule.keyword,
          category_id: schedule.category_id,
          results_count: tools.length,
          status: "completed",
          created_by: schedule.created_by,
          metadata: { scheduled: true, schedule_id: schedule.id, data_source: dataSource },
        })
        .select("id")
        .single();

      if (session && tools.length > 0) {
        const items = tools.map((t: any) => ({
          session_id: session.id,
          name: t.name || "Unknown",
          website_url: t.website_url || null,
          description: t.description || null,
          pricing_type: t.pricing_type || "contact",
          category_name: t.category_name || catName || null,
          source_url: t.source_url || null,
          collected_data: { ...t, data_source: dataSource },
          status: "pending",
        }));
        await supabase.from("collect_items").insert(items);
      }

      await supabase.from("collect_schedules").update({
        last_run_at: new Date().toISOString(),
        last_session_id: session?.id || null,
        results_total: (schedule.results_total || 0) + tools.length,
      }).eq("id", schedule.id);

      return new Response(JSON.stringify({ success: true, tools_count: tools.length, data_source: dataSource, session_id: session?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("collect-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
