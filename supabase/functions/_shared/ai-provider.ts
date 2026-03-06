// Shared AI provider routing for multi-provider support
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AIProviderConfig {
  ai_chat: string;
  ai_search: string;
  content_generation: string;
}

export interface AIKeys {
  openai_api_key?: string;
  gemini_api_key?: string;
  cometapi_api_key?: string;
  perplexity_api_key?: string;
}

const PROVIDER_ENDPOINTS: Record<string, string> = {
  lovable: "https://ai.gateway.lovable.dev/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  cometapi: "", // user configures endpoint
  perplexity: "https://api.perplexity.ai/chat/completions",
};

const DEFAULT_MODELS: Record<string, string> = {
  lovable: "google/gemini-3-flash-preview",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  cometapi: "gpt-4o-mini",
  perplexity: "sonar",
};

export async function getProviderConfig(): Promise<{ config: AIProviderConfig; keys: AIKeys }> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["ai_provider_config", "ai_keys"]);

  const settings: Record<string, any> = {};
  data?.forEach((row: any) => {
    settings[row.key] = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
  });

  const config: AIProviderConfig = {
    ai_chat: settings.ai_provider_config?.ai_chat || "lovable",
    ai_search: settings.ai_provider_config?.ai_search || "lovable",
    content_generation: settings.ai_provider_config?.content_generation || "lovable",
  };

  const keys: AIKeys = settings.ai_keys || {};

  return { config, keys };
}

function getApiKey(provider: string, keys: AIKeys): string | null {
  switch (provider) {
    case "lovable": return Deno.env.get("LOVABLE_API_KEY") || null;
    case "openai": return keys.openai_api_key || null;
    case "gemini": return keys.gemini_api_key || null;
    case "cometapi": return keys.cometapi_api_key || null;
    case "perplexity": return keys.perplexity_api_key || null;
    default: return null;
  }
}

export async function callAI(opts: {
  feature: keyof AIProviderConfig;
  messages: Array<{ role: string; content: string }>;
  model?: string;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
}): Promise<Response> {
  const { config, keys } = await getProviderConfig();
  const provider = config[opts.feature] || "lovable";
  const apiKey = getApiKey(provider, keys);

  if (!apiKey) {
    // Fallback to Lovable
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("No AI provider configured");
    return callProvider("lovable", lovableKey, opts);
  }

  try {
    const response = await callProvider(provider, apiKey, opts);
    if (!response.ok && provider !== "lovable") {
      // Fallback to Lovable on error
      console.warn(`Provider ${provider} failed (${response.status}), falling back to Lovable`);
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableKey) return callProvider("lovable", lovableKey, opts);
    }
    return response;
  } catch (e) {
    console.warn(`Provider ${provider} error, falling back to Lovable:`, e);
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) return callProvider("lovable", lovableKey, opts);
    throw e;
  }
}

async function callProvider(
  provider: string,
  apiKey: string,
  opts: { messages: any[]; model?: string; stream?: boolean; tools?: any[]; tool_choice?: any }
): Promise<Response> {
  const endpoint = PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.lovable;
  const model = opts.model || DEFAULT_MODELS[provider] || DEFAULT_MODELS.lovable;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider === "gemini") {
    headers["x-goog-api-key"] = apiKey;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const body: any = { model, messages: opts.messages };
  if (opts.stream) body.stream = true;
  if (opts.tools) body.tools = opts.tools;
  if (opts.tool_choice) body.tool_choice = opts.tool_choice;

  return fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
}
