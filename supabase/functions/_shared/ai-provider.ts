// Shared AI provider routing for multi-provider support
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AIFeature =
  | "ai_chat"
  | "ai_search"
  | "blog_generation"
  | "tool_article"
  | "review_generation"
  | "workflow_generation"
  | "translation"
  | "content_generation";

export interface FeatureConfig {
  provider: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export type AIProviderConfig = Record<AIFeature, string | FeatureConfig>;

// A user-defined OpenAI-compatible provider (unlimited, added via Admin UI).
// Its API key lives in AIKeys under `${id}_api_key` / `${id}_api_key_2`,
// following the same naming convention as built-in providers.
export interface CustomProvider {
  id: string; // slug, e.g. "custom_tokenrouter"
  name: string;
  base_url: string; // e.g. "https://api.tokenrouter.com/v1" (no trailing /chat/completions)
  default_model?: string;
  models?: string[]; // cached from the last "fetch models" call
}

export interface AIKeys {
  openai_api_key?: string;
  openai_api_key_2?: string;
  gemini_api_key?: string;
  gemini_api_key_2?: string;
  cometapi_api_key?: string;
  cometapi_api_key_2?: string;
  perplexity_api_key?: string;
  perplexity_api_key_2?: string;
  anthropic_api_key?: string;
  anthropic_api_key_2?: string;
  openrouter_api_key?: string;
  openrouter_api_key_2?: string;
  xai_api_key?: string;
  xai_api_key_2?: string;
  cerebras_api_key?: string;
  cerebras_api_key_2?: string;
  tokenrouter_api_key?: string;
  tokenrouter_api_key_2?: string;
  // Custom providers use dynamic keys: `${id}_api_key`, `${id}_api_key_2`
  [key: string]: string | undefined;
}

const PROVIDER_ENDPOINTS: Record<string, string> = {
  lovable: "https://ai.gateway.lovable.dev/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  cometapi: "", // user configures endpoint
  perplexity: "https://api.perplexity.ai/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  xai: "https://api.x.ai/v1/chat/completions",
  cerebras: "https://api.cerebras.ai/v1/chat/completions",
  tokenrouter: "https://api.tokenrouter.com/v1/chat/completions",
};

const DEFAULT_MODELS: Record<string, string> = {
  lovable: "google/gemini-3-flash-preview",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.5-flash",
  cometapi: "gpt-4o-mini",
  perplexity: "sonar",
  anthropic: "claude-sonnet-4-20250514",
  openrouter: "google/gemini-2.5-flash",
  xai: "grok-3-mini",
  cerebras: "llama-4-scout-17b-16e-instruct",
  tokenrouter: "z-ai/glm-5.3-free",
};

export const MODEL_CATALOG: Record<string, string[]> = {
  lovable: [
    "google/gemini-2.5-pro", "google/gemini-3.1-pro-preview", "google/gemini-3-flash-preview",
    "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite",
    "openai/gpt-5", "openai/gpt-5-mini", "openai/gpt-5-nano", "openai/gpt-5.2",
  ],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini", "o3-mini"],
  gemini: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  anthropic: ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  openrouter: ["google/gemini-2.5-flash", "openai/gpt-4o", "anthropic/claude-sonnet-4-20250514", "meta-llama/llama-4-maverick", "deepseek/deepseek-r1"],
  xai: ["grok-3", "grok-3-mini", "grok-2", "grok-2-mini"],
  cerebras: ["llama-4-scout-17b-16e-instruct", "llama3.3-70b", "llama3.1-8b"],
  perplexity: ["sonar", "sonar-pro", "sonar-reasoning", "sonar-reasoning-pro"],
  cometapi: ["gpt-4o", "gpt-4o-mini", "claude-3-5-sonnet-20241022"],
  tokenrouter: [
    "z-ai/glm-5.3-free", "z-ai/glm-5.3", "z-ai/glm-5.2", "z-ai/glm-5.1", "z-ai/glm-5-turbo",
    "z-ai/glm-4.6", "z-ai/glm-4.5-air", "openai/gpt-5.2", "openai/gpt-5.4-mini", "openai/gpt-5.4-nano",
    "openai/gpt-oss-120b", "openai/gpt-4o-mini", "deepseek/deepseek-v4-pro", "deepseek/deepseek-v3.2",
    "deepseek/deepseek-v4-flash", "qwen/qwen3.7-max", "qwen/qwen3.8-flash", "qwen/qwen3-coder-next",
    "x-ai/grok-4.6", "x-ai/grok-4.5", "x-ai/grok-4.1-fast", "moonshotai/kimi-k3",
    "minimax/minimax-m2.7", "mistralai/mistral-medium-3-5",
  ],
};

function parseFeatureConfig(raw: any): { provider: string; model?: string; temperature?: number; max_tokens?: number } {
  if (!raw) return { provider: "lovable" };
  if (typeof raw === "string") return { provider: raw };
  return {
    provider: raw.provider || "lovable",
    model: raw.model,
    temperature: raw.temperature,
    max_tokens: raw.max_tokens,
  };
}

export async function getProviderConfig(): Promise<{ config: AIProviderConfig; keys: AIKeys; customProviders: CustomProvider[] }> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["ai_provider_config", "ai_keys", "custom_ai_providers"]);

  const settings: Record<string, any> = {};
  data?.forEach((row: any) => {
    settings[row.key] = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
  });

  const rawConfig = settings.ai_provider_config || {};
  const config: AIProviderConfig = {
    ai_chat: rawConfig.ai_chat || "lovable",
    ai_search: rawConfig.ai_search || "lovable",
    blog_generation: rawConfig.blog_generation || rawConfig.content_generation || "lovable",
    tool_article: rawConfig.tool_article || rawConfig.content_generation || "lovable",
    review_generation: rawConfig.review_generation || rawConfig.content_generation || "lovable",
    workflow_generation: rawConfig.workflow_generation || rawConfig.content_generation || "lovable",
    translation: rawConfig.translation || rawConfig.content_generation || "lovable",
    content_generation: rawConfig.content_generation || "lovable",
  };

  const keys: AIKeys = settings.ai_keys || {};
  const customProviders: CustomProvider[] = Array.isArray(settings.custom_ai_providers) ? settings.custom_ai_providers : [];
  return { config, keys, customProviders };
}

const KEY_FIELDS: Record<string, string> = {
  openai: "openai_api_key",
  gemini: "gemini_api_key",
  cometapi: "cometapi_api_key",
  perplexity: "perplexity_api_key",
  anthropic: "anthropic_api_key",
  openrouter: "openrouter_api_key",
  xai: "xai_api_key",
  cerebras: "cerebras_api_key",
  tokenrouter: "tokenrouter_api_key",
};

// Custom providers use a dynamic key field: `${provider.id}_api_key`
function keyFieldFor(provider: string): string {
  return KEY_FIELDS[provider] || `${provider}_api_key`;
}

function getApiKeys(provider: string, keys: AIKeys): string[] {
  if (provider === "lovable") {
    const k = Deno.env.get("LOVABLE_API_KEY");
    return k ? [k] : [];
  }
  const field = keyFieldFor(provider);
  const primary = (keys as any)[field];
  const backup = (keys as any)[field + "_2"];
  const result: string[] = [];
  if (primary) result.push(primary);
  if (backup) result.push(backup);
  return result;
}

async function logUsage(opts: {
  provider: string;
  feature: string;
  model?: string;
  tokens_used?: number;
  duration_ms: number;
  status: string;
  error_message?: string;
}) {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await supabase.from("ai_usage_logs").insert({
      provider: opts.provider,
      feature: opts.feature,
      model: opts.model || null,
      tokens_used: opts.tokens_used || 0,
      duration_ms: opts.duration_ms,
      status: opts.status,
      error_message: opts.error_message || null,
    });
  } catch (e) {
    console.warn("Failed to log AI usage:", e);
  }
}

export async function callAI(opts: {
  feature: AIFeature;
  messages: Array<{ role: string; content: string }>;
  model?: string;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  temperature?: number;
  max_tokens?: number;
}): Promise<Response> {
  const startTime = Date.now();
  const { config, keys, customProviders } = await getProviderConfig();
  const featureRaw = config[opts.feature] || config.content_generation || "lovable";
  const fc = parseFeatureConfig(featureRaw);
  const provider = fc.provider || "lovable";
  const custom = customProviders.find((p) => p.id === provider);
  const model = opts.model || fc.model;
  const temperature = opts.temperature ?? fc.temperature;
  const max_tokens = opts.max_tokens ?? fc.max_tokens;
  const resolvedModel = model || custom?.default_model || DEFAULT_MODELS[provider] || DEFAULT_MODELS.lovable;

  const apiKeys = getApiKeys(provider, keys);

  // Try each key for the selected provider
  for (const apiKey of apiKeys) {
    try {
      const response = await callProvider(provider, apiKey, { ...opts, model, temperature, max_tokens }, custom);
      if (response.ok) {
        const duration = Date.now() - startTime;
        // Clone to read usage without consuming body
        const cloned = response.clone();
        let tokensUsed = 0;
        try {
          const json = await cloned.json();
          tokensUsed = json.usage?.total_tokens || 0;
        } catch { /* ignore */ }
        logUsage({ provider, feature: opts.feature, model: resolvedModel, tokens_used: tokensUsed, duration_ms: duration, status: "success" });
        return response;
      }
      console.warn(`Provider ${provider} failed (${response.status})`);
    } catch (e) {
      console.warn(`Provider ${provider} error:`, e);
    }
  }

  // Fallback to Lovable
  if (provider !== "lovable") {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) {
      console.warn(`Falling back to Lovable from ${provider}`);
      const response = await callProvider("lovable", lovableKey, { ...opts, model: undefined, temperature, max_tokens });
      const duration = Date.now() - startTime;
      logUsage({ provider: "lovable", feature: opts.feature, model: DEFAULT_MODELS.lovable, duration_ms: duration, status: "fallback", error_message: `Fallback from ${provider}` });
      return response;
    }
  }

  const duration = Date.now() - startTime;
  logUsage({ provider, feature: opts.feature, model: resolvedModel, duration_ms: duration, status: "error", error_message: "All providers failed" });
  throw new Error("No AI provider configured or all providers failed");
}

async function callProvider(
  provider: string,
  apiKey: string,
  opts: { messages: any[]; model?: string; stream?: boolean; tools?: any[]; tool_choice?: any; temperature?: number; max_tokens?: number },
  custom?: CustomProvider
): Promise<Response> {
  if (provider === "anthropic") {
    return callAnthropicProvider(apiKey, opts);
  }

  // Custom (user-added) OpenAI-compatible provider: base_url + "/chat/completions"
  const endpoint = custom
    ? `${custom.base_url.replace(/\/+$/, "")}/chat/completions`
    : (PROVIDER_ENDPOINTS[provider] || PROVIDER_ENDPOINTS.lovable);
  const model = opts.model || custom?.default_model || DEFAULT_MODELS[provider] || DEFAULT_MODELS.lovable;

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
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.max_tokens !== undefined) body.max_tokens = opts.max_tokens;

  return fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
}

async function callAnthropicProvider(
  apiKey: string,
  opts: { messages: any[]; model?: string; stream?: boolean; temperature?: number; max_tokens?: number }
): Promise<Response> {
  const model = opts.model || DEFAULT_MODELS.anthropic;

  // Extract system message
  let systemText = "";
  const messages = opts.messages.filter((m) => {
    if (m.role === "system") {
      systemText += (systemText ? "\n" : "") + m.content;
      return false;
    }
    return true;
  });

  const body: any = {
    model,
    messages,
    max_tokens: opts.max_tokens || 4096,
  };
  if (systemText) body.system = systemText;
  if (opts.temperature !== undefined) body.temperature = opts.temperature;

  const response = await fetch(PROVIDER_ENDPOINTS.anthropic, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) return response;

  // Convert Anthropic response to OpenAI format
  const data = await response.json();
  const text = data.content?.map((c: any) => c.text).join("") || "";

  const openaiFormat = {
    choices: [{
      message: { role: "assistant", content: text },
      finish_reason: data.stop_reason === "end_turn" ? "stop" : data.stop_reason,
    }],
    model: data.model,
    usage: {
      prompt_tokens: data.usage?.input_tokens || 0,
      completion_tokens: data.usage?.output_tokens || 0,
      total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
  };

  return new Response(JSON.stringify(openaiFormat), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
