import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { action, keys, provider_config, test_provider, test_key } = await req.json();

    if (action === "get") {
      // Return masked keys + provider config
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["ai_keys", "ai_provider_config", "site_info"]);
      const result: Record<string, any> = {};
      data?.forEach((row: any) => {
        const val = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
        if (row.key === "ai_keys") {
          // Mask all keys
          const masked: Record<string, string> = {};
          for (const [k, v] of Object.entries(val)) {
            masked[k] = v ? maskKey(v as string) : "";
          }
          result.ai_keys_masked = masked;
          // Also indicate which keys are configured
          const configured: Record<string, boolean> = {};
          for (const [k, v] of Object.entries(val)) {
            configured[k] = !!(v as string);
          }
          result.ai_keys_configured = configured;
        } else {
          result[row.key] = val;
        }
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_keys") {
      // Merge with existing keys (only update non-empty values)
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

    if (action === "save_provider_config") {
      await supabase.from("site_settings").upsert(
        { key: "ai_provider_config", value: provider_config, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test") {
      // Test a provider connection
      const endpoints: Record<string, string> = {
        openai: "https://api.openai.com/v1/models",
        gemini: "https://generativelanguage.googleapis.com/v1beta/models?key=" + (test_key || ""),
        perplexity: "https://api.perplexity.ai/chat/completions",
        cometapi: "https://api.cometapi.com/v1/models",
        firecrawl: "https://api.firecrawl.dev/v1/scrape",
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
