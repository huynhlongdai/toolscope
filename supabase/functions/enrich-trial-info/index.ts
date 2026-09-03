import { corsHeaders, requireAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;

  try {
    const { tool_id, batch } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = auth.supabase;

    // Get tools to enrich
    let toolsToEnrich: any[] = [];
    if (tool_id) {
      const { data } = await supabase.from("tools").select("id, name, website_url, pricing_type").eq("id", tool_id).single();
      if (data) toolsToEnrich = [data];
    } else if (batch) {
      const { data } = await supabase
        .from("tools")
        .select("id, name, website_url, pricing_type")
        .eq("status", "published")
        .is("trial_days", null)
        .not("website_url", "is", null)
        .limit(20);
      toolsToEnrich = data ?? [];
    }

    if (toolsToEnrich.length === 0) {
      return new Response(JSON.stringify({ message: "No tools to enrich", enriched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const tool of toolsToEnrich) {
      try {
        let pageContent = "";

        // Try Firecrawl first for pricing page
        if (FIRECRAWL_API_KEY && tool.website_url) {
          try {
            const pricingUrl = tool.website_url.replace(/\/$/, "") + "/pricing";
            const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ url: pricingUrl, formats: ["markdown"], onlyMainContent: true, waitFor: 3000 }),
            });
            if (res.ok) {
              const d = await res.json();
              pageContent = (d.data?.markdown || d.markdown || "").slice(0, 4000);
            }
          } catch { /* fallback below */ }

          // Also scrape signup page if no content yet
          if (!pageContent) {
            try {
              const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({ url: tool.website_url, formats: ["markdown"], onlyMainContent: true, waitFor: 3000 }),
              });
              if (res.ok) {
                const d = await res.json();
                pageContent = (d.data?.markdown || d.markdown || "").slice(0, 4000);
              }
            } catch { /* continue */ }
          }
        }

        const prompt = `Analyze this tool's trial and signup information.
Tool: ${tool.name}
Website: ${tool.website_url}
Current pricing type: ${tool.pricing_type}

${pageContent ? `Page content:\n${pageContent}` : "No page content available. Use your knowledge about this tool."}

Return ONLY valid JSON:
{
  "has_free_trial": boolean,
  "trial_days": number or null (e.g. 7, 14, 30),
  "requires_card": boolean or null (whether credit card needed for trial/signup),
  "signup_options": ["free_signup", "google_sso", "github_sso", "email_only", "demo_request", "apple_sso"]
}

Only include signup_options that actually exist. If unsure, set to null.`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Extract trial and signup info. Return valid JSON only." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (!aiRes.ok) { console.error(`AI error for ${tool.name}:`, aiRes.status); continue; }

        const aiData = await aiRes.json();
        let raw = aiData.choices?.[0]?.message?.content || "{}";
        raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        const info = JSON.parse(raw);

        const updateData: any = {};
        if (info.has_free_trial != null) updateData.has_free_trial = info.has_free_trial;
        if (info.trial_days != null) updateData.trial_days = info.trial_days;
        if (info.requires_card != null) updateData.requires_card = info.requires_card;
        if (Array.isArray(info.signup_options)) updateData.signup_options = info.signup_options;

        if (Object.keys(updateData).length > 0) {
          await supabase.from("tools").update(updateData).eq("id", tool.id);
        }

        results.push({ id: tool.id, name: tool.name, ...info, updated: true });
      } catch (err) {
        console.error(`Error enriching ${tool.name}:`, err);
        results.push({ id: tool.id, name: tool.name, error: String(err), updated: false });
      }
    }

    return new Response(JSON.stringify({ enriched: results.filter(r => r.updated).length, total: toolsToEnrich.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-trial-info error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
