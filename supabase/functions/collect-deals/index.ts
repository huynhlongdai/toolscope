import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, query, tool_id, tool_name, item_ids, item_id } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    let userId: string | null = null;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (action === "search") {
      const searchQuery = tool_name
        ? `${tool_name} coupon code discount deal promo 2025 2026`
        : `${query} AI tool coupon code discount deal`;

      let content = "";
      let dataSource = "ai";

      const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (apiKey) {
        try {
          const response = await fetch("https://api.firecrawl.dev/v1/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery, limit: 15 }),
          });
          if (response.ok) {
            const data = await response.json();
            const results = data.data || [];
            content = results.map((r: any) => `Title: ${r.title || ""}\nURL: ${r.url || ""}\nDescription: ${r.description || ""}\n---`).join("\n");
            dataSource = "firecrawl";
          }
        } catch (e) {
          console.warn("Firecrawl search error:", e);
        }
      }

      // Parse deals with AI
      const toolContext = tool_name ? `for the tool "${tool_name}"` : `related to "${query}"`;
      const prompt = `From the following search results, extract all deals, coupons, and discount offers ${toolContext}.

Search results:
${content.slice(0, 10000) || `No search results available. Use your knowledge to find known deals, coupons and promotions ${toolContext}.`}

Return ONLY a JSON array. Each deal object:
{
  "title": "Deal title in English",
  "description": "Brief description in English",
  "coupon_code": "COUPON_CODE or null",
  "discount_type": "percentage|fixed|free_trial|custom",
  "discount_value": 50,
  "deal_url": "https://...",
  "original_price": null,
  "deal_price": null,
  "currency": "USD",
  "expires_at": "2026-12-31T00:00:00Z or null",
  "source_url": "URL where found",
  "tool_name": "Tool name this deal is for"
}

Only include real, verifiable deals. Max 20 items. If no deals found, return [].`;

      const aiResponse = await callAI({
        feature: "content_generation",
        messages: [
          { role: "system", content: "You extract deal and coupon information from web content. Always respond with a valid JSON array only, no markdown." },
          { role: "user", content: prompt },
        ],
      });

      if (!aiResponse.ok) throw new Error(`AI error: ${aiResponse.status}`);

      const aiData = await aiResponse.json();
      let raw = aiData.choices?.[0]?.message?.content || "[]";
      raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      let deals: any[] = [];
      try {
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) deals = JSON.parse(match[0]);
      } catch { deals = []; }

      // Save to deal_collect_items
      const sessionId = crypto.randomUUID();

      if (deals.length > 0) {
        const items = deals.map((d: any) => ({
          session_id: sessionId,
          tool_id: tool_id || null,
          tool_name: d.tool_name || tool_name || null,
          title: d.title || "Unknown Deal",
          description: d.description || null,
          coupon_code: d.coupon_code || null,
          discount_type: d.discount_type || "percentage",
          discount_value: d.discount_value || null,
          deal_url: d.deal_url || null,
          original_price: d.original_price || null,
          deal_price: d.deal_price || null,
          currency: d.currency || "USD",
          expires_at: d.expires_at || null,
          source_url: d.source_url || null,
          collected_data: { ...d, data_source: dataSource, search_query: searchQuery },
          status: "pending",
        }));

        await supabase.from("deal_collect_items").insert(items);
      }

      return new Response(JSON.stringify({
        session_id: sessionId,
        deals_count: deals.length,
        data_source: dataSource,
        deals: deals.slice(0, 5),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "import") {
      if (!item_ids?.length) throw new Error("item_ids required");

      const { data: items, error } = await supabase
        .from("deal_collect_items")
        .select("*")
        .in("id", item_ids)
        .in("status", ["pending", "approved"]);

      if (error) throw error;
      if (!items?.length) throw new Error("No items found");

      let imported = 0;
      for (const item of items) {
        const dealPayload: any = {
          tool_id: item.tool_id,
          title: item.title,
          description: item.description,
          coupon_code: item.coupon_code,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          deal_url: item.deal_url,
          original_price: item.original_price,
          deal_price: item.deal_price,
          currency: item.currency || "USD",
          expires_at: item.expires_at,
          is_active: true,
          is_verified: false,
          is_exclusive: false,
          created_by: userId,
        };

        if (!dealPayload.tool_id && item.tool_name) {
          const { data: tool } = await supabase.from("tools").select("id").ilike("name", item.tool_name).limit(1).maybeSingle();
          if (tool) dealPayload.tool_id = tool.id;
        }

        if (!dealPayload.tool_id) continue;

        const { data: newDeal } = await supabase.from("deals").insert(dealPayload).select("id").single();
        if (newDeal) {
          await supabase.from("deal_collect_items").update({ status: "imported", imported_deal_id: newDeal.id }).eq("id", item.id);
          imported++;
        }
      }

      return new Response(JSON.stringify({ imported }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reject") {
      if (!item_ids?.length && !item_id) throw new Error("item_ids or item_id required");
      const ids = item_ids || [item_id];
      await supabase.from("deal_collect_items").update({ status: "rejected" }).in("id", ids);
      return new Response(JSON.stringify({ rejected: ids.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "generate-description") {
      const { deal_title, tool_name: tName, discount_type, discount_value } = body;
      const prompt = `Write a short, engaging deal description in English for:
- Tool: ${tName || "unknown"}
- Deal title: ${deal_title || "discount"}
- Discount: ${discount_type === "percentage" ? `${discount_value}%` : discount_type === "fixed" ? `$${discount_value}` : discount_type}

Return ONLY the description text, 1-2 sentences, no quotes.`;

      const aiResponse = await callAI({
        feature: "content_generation",
        messages: [
          { role: "system", content: "You write concise deal descriptions in English." },
          { role: "user", content: prompt },
        ],
      });

      if (!aiResponse.ok) throw new Error("AI error");
      const aiData = await aiResponse.json();
      const description = aiData.choices?.[0]?.message?.content?.trim() || "";

      return new Response(JSON.stringify({ description }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("collect-deals error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
