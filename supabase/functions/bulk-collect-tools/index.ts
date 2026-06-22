import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KEYWORDS = [
  "project management tool",
  "design tool graphic",
  "video editing software",
  "AI writing assistant",
  "CRM software",
  "email marketing platform",
  "SEO tool",
  "accounting software",
  "social media management",
  "cloud storage service",
  "password manager",
  "note taking app",
  "code editor IDE",
  "website builder",
  "photo editing software",
  "database management tool",
  "analytics platform",
  "team communication tool",
  "HR management software",
  "e-commerce platform",
  "workflow automation tool",
  "presentation software",
  "scheduling calendar app",
  "file sharing collaboration",
  "cybersecurity tool",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size || 25; // how many keywords to process
    const keywordsToProcess = KEYWORDS.slice(0, batchSize);

    const allTools: Map<string, any> = new Map(); // deduplicate by lowercase name
    const results: any[] = [];

    for (let i = 0; i < keywordsToProcess.length; i++) {
      const keyword = keywordsToProcess[i];
      
      try {
        // Create session for this batch
        const { data: session, error: sessionErr } = await supabase
          .from("collect_sessions")
          .insert({
            query: `bulk: ${keyword}`,
            search_type: "keyword",
            created_by: body.user_id || "00000000-0000-0000-0000-000000000000",
            status: "completed",
            metadata: { source: "bulk-collect", keyword_index: i },
          })
          .select("id")
          .single();

        if (sessionErr || !session) {
          results.push({ keyword, error: sessionErr?.message || "Failed to create session" });
          continue;
        }

        // Call AI to generate tool list
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a software tools expert. Return ONLY the JSON tool call result. Be accurate with real tool names and URLs."
              },
              {
                role: "user",
                content: `List 20 real, popular software tools for: "${keyword}". Include well-known and emerging tools. Each tool must be a real product that exists.`
              }
            ],
            tools: [{
              type: "function",
              function: {
                name: "return_tools",
                description: "Return a list of software tools",
                parameters: {
                  type: "object",
                  properties: {
                    tools: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string", description: "Tool name" },
                          website_url: { type: "string", description: "Official website URL" },
                          description_vi: { type: "string", description: "Brief description in English (1-2 sentences)" },
                          pricing_type: { type: "string", enum: ["free", "freemium", "paid", "open_source"], description: "Pricing model" },
                          category_name: { type: "string", description: "Category in English" },
                        },
                        required: ["name", "website_url", "description_vi", "pricing_type", "category_name"],
                        additionalProperties: false,
                      }
                    }
                  },
                  required: ["tools"],
                  additionalProperties: false,
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "return_tools" } },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`AI error for "${keyword}":`, response.status, errText);
          
          if (response.status === 429) {
            // Rate limited - wait and continue
            results.push({ keyword, error: "Rate limited, skipped" });
            await new Promise(r => setTimeout(r, 5000));
            continue;
          }
          results.push({ keyword, error: `AI error ${response.status}` });
          continue;
        }

        const aiData = await response.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) {
          results.push({ keyword, error: "No tool call in response" });
          continue;
        }

        let tools: any[];
        try {
          tools = JSON.parse(toolCall.function.arguments).tools;
        } catch {
          results.push({ keyword, error: "Failed to parse tool call" });
          continue;
        }

        // Deduplicate and prepare items
        const newItems: any[] = [];
        for (const tool of tools) {
          const key = tool.name.toLowerCase().trim();
          if (allTools.has(key)) continue;
          allTools.set(key, tool);
          newItems.push({
            session_id: session.id,
            name: tool.name,
            website_url: tool.website_url,
            description: tool.description_vi,
            pricing_type: tool.pricing_type || "freemium",
            category_name: tool.category_name,
            status: "pending",
            collected_data: { source: "bulk-collect", keyword, raw: tool },
          });
        }

        if (newItems.length > 0) {
          const { error: insertErr } = await supabase
            .from("collect_items")
            .insert(newItems);
          
          if (insertErr) {
            results.push({ keyword, error: insertErr.message });
          } else {
            // Update session results count
            await supabase.from("collect_sessions")
              .update({ results_count: newItems.length })
              .eq("id", session.id);
            
            results.push({ keyword, count: newItems.length, session_id: session.id });
          }
        } else {
          results.push({ keyword, count: 0, note: "All duplicates" });
        }

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 1500));

      } catch (e: any) {
        results.push({ keyword, error: e.message });
      }
    }

    const totalCollected = allTools.size;
    
    return new Response(JSON.stringify({
      total_collected: totalCollected,
      keywords_processed: keywordsToProcess.length,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("bulk-collect error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
