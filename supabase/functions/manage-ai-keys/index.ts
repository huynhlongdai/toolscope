import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MODEL_CATALOG } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function maskKey(key: string): string {
  if (!key || key.length < 8) return "****";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (!role) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const body = await req.json();
    const { action } = body;

    if (action === "get") {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["ai_keys", "ai_provider_config", "site_info"]);
      const result: Record<string, any> = {};
      data?.forEach((row: any) => {
        const val = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
        if (row.key === "ai_keys") {
          const masked: Record<string, string> = {};
          const configured: Record<string, boolean> = {};
          for (const [k, v] of Object.entries(val)) {
            masked[k] = v ? maskKey(v as string) : "";
            configured[k] = !!(v as string);
          }
          result.ai_keys_masked = masked;
          result.ai_keys_configured = configured;
        } else {
          result[row.key] = val;
        }
      });
      result.model_catalog = MODEL_CATALOG;
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_keys") {
      const { keys } = body;
      const { data: existing } = await supabase.from("site_settings").select("value").eq("key", "ai_keys").maybeSingle();
      const currentKeys = existing?.value ? (typeof existing.value === "string" ? JSON.parse(existing.value) : existing.value) : {};
      
      for (const [k, v] of Object.entries(keys || {})) {
        if (v && (v as string).length > 0 && !(v as string).includes("...")) {
          currentKeys[k] = v;
        }
      }

      await supabase.from("site_settings").upsert(
        { key: "ai_keys", value: currentKeys, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_key") {
      const { key_field } = body;
      if (!key_field) {
        return new Response(JSON.stringify({ error: "key_field required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: existing } = await supabase.from("site_settings").select("value").eq("key", "ai_keys").maybeSingle();
      const currentKeys = existing?.value ? (typeof existing.value === "string" ? JSON.parse(existing.value) : existing.value) : {};
      delete currentKeys[key_field];
      await supabase.from("site_settings").upsert(
        { key: "ai_keys", value: currentKeys, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_provider_config") {
      const { provider_config } = body;
      await supabase.from("site_settings").upsert(
        { key: "ai_provider_config", value: provider_config, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test") {
      const { test_provider, test_key } = body;
      const endpoints: Record<string, string> = {
        openai: "https://api.openai.com/v1/models",
        gemini: "https://generativelanguage.googleapis.com/v1beta/models?key=" + (test_key || ""),
        perplexity: "https://api.perplexity.ai/chat/completions",
        cometapi: "https://api.cometapi.com/v1/models",
        firecrawl: "https://api.firecrawl.dev/v1/scrape",
        anthropic: "https://api.anthropic.com/v1/models",
        openrouter: "https://openrouter.ai/api/v1/models",
        xai: "https://api.x.ai/v1/models",
        cerebras: "https://api.cerebras.ai/v1/models",
      };

      const endpoint = endpoints[test_provider];
      if (!endpoint || !test_key) {
        return new Response(JSON.stringify({ success: false, error: "Invalid provider or key" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        let resp: Response;
        if (test_provider === "gemini") {
          resp = await fetch(endpoint);
        } else if (test_provider === "perplexity") {
          resp = await fetch(endpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${test_key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "sonar", messages: [{ role: "user", content: "test" }], max_tokens: 5 }),
          });
        } else if (test_provider === "anthropic") {
          resp = await fetch(endpoint, {
            method: "GET",
            headers: { "x-api-key": test_key, "anthropic-version": "2023-06-01" },
          });
        } else {
          resp = await fetch(endpoint, {
            method: "GET",
            headers: { Authorization: `Bearer ${test_key}` },
          });
        }

        const ok = resp.status < 400;
        return new Response(JSON.stringify({ success: ok, status: resp.status }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "deep_test") {
      const { test_provider, test_key, test_model } = body;
      if (!test_provider || !test_key) {
        return new Response(JSON.stringify({ success: false, error: "Provider and key required" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const startTime = Date.now();
      try {
        const defaultModels: Record<string, string> = {
          openai: "gpt-4o-mini", gemini: "gemini-2.5-flash", anthropic: "claude-sonnet-4-20250514",
          openrouter: "google/gemini-2.5-flash", xai: "grok-3-mini", cerebras: "llama-4-scout-17b-16e-instruct",
          perplexity: "sonar", cometapi: "gpt-4o-mini",
        };
        const model = test_model || defaultModels[test_provider] || "gpt-4o-mini";
        const messages = [{ role: "user", content: "Say hello in one word." }];

        let resp: Response;
        if (test_provider === "anthropic") {
          resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": test_key, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({ model, messages, max_tokens: 20 }),
          });
        } else if (test_provider === "gemini") {
          resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": test_key },
            body: JSON.stringify({ model, messages, max_tokens: 20 }),
          });
        } else {
          const endpoints: Record<string, string> = {
            openai: "https://api.openai.com/v1/chat/completions",
            openrouter: "https://openrouter.ai/api/v1/chat/completions",
            xai: "https://api.x.ai/v1/chat/completions",
            cerebras: "https://api.cerebras.ai/v1/chat/completions",
            perplexity: "https://api.perplexity.ai/chat/completions",
            cometapi: "https://api.cometapi.com/v1/chat/completions",
          };
          resp = await fetch(endpoints[test_provider] || endpoints.openai, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${test_key}` },
            body: JSON.stringify({ model, messages, max_tokens: 20 }),
          });
        }

        const duration = Date.now() - startTime;
        if (!resp.ok) {
          const errText = await resp.text();
          return new Response(JSON.stringify({ success: false, status: resp.status, error: errText, duration_ms: duration }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await resp.json();
        const reply = test_provider === "anthropic"
          ? data.content?.[0]?.text || ""
          : data.choices?.[0]?.message?.content || "";
        const modelUsed = data.model || model;

        return new Response(JSON.stringify({ success: true, reply, model: modelUsed, duration_ms: duration }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        const duration = Date.now() - startTime;
        return new Response(JSON.stringify({ success: false, error: (e as Error).message, duration_ms: duration }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "get_usage_stats") {
      const { days = 7 } = body;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data: logs } = await supabase
        .from("ai_usage_logs")
        .select("provider, feature, model, tokens_used, duration_ms, status, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);

      // Aggregate
      const byProvider: Record<string, { count: number; tokens: number; avg_duration: number; errors: number }> = {};
      const byFeature: Record<string, { count: number; tokens: number }> = {};
      const byDay: Record<string, number> = {};

      (logs || []).forEach((log: any) => {
        // By provider
        if (!byProvider[log.provider]) byProvider[log.provider] = { count: 0, tokens: 0, avg_duration: 0, errors: 0 };
        byProvider[log.provider].count++;
        byProvider[log.provider].tokens += log.tokens_used || 0;
        byProvider[log.provider].avg_duration += log.duration_ms || 0;
        if (log.status === "error") byProvider[log.provider].errors++;

        // By feature
        if (!byFeature[log.feature]) byFeature[log.feature] = { count: 0, tokens: 0 };
        byFeature[log.feature].count++;
        byFeature[log.feature].tokens += log.tokens_used || 0;

        // By day
        const day = log.created_at.split("T")[0];
        byDay[day] = (byDay[day] || 0) + 1;
      });

      // Calculate avg duration
      for (const p of Object.values(byProvider)) {
        p.avg_duration = p.count > 0 ? Math.round(p.avg_duration / p.count) : 0;
      }

      return new Response(JSON.stringify({
        total_calls: (logs || []).length,
        by_provider: byProvider,
        by_feature: byFeature,
        by_day: byDay,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "export_config") {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "ai_provider_config").maybeSingle();
      return new Response(JSON.stringify({ config: data?.value || {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import_config") {
      const { config } = body;
      if (!config || typeof config !== "object") {
        return new Response(JSON.stringify({ error: "Invalid config" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("site_settings").upsert(
        { key: "ai_provider_config", value: config, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("manage-ai-keys error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
