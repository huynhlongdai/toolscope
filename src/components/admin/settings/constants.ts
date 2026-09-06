export const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", keyField: "openai_api_key", placeholder: "sk-..." },
  { id: "anthropic", name: "Anthropic (Claude)", keyField: "anthropic_api_key", placeholder: "sk-ant-..." },
  { id: "gemini", name: "Google Gemini", keyField: "gemini_api_key", placeholder: "AIza..." },
  { id: "openrouter", name: "OpenRouter", keyField: "openrouter_api_key", placeholder: "sk-or-..." },
  { id: "xai", name: "xAI (Grok)", keyField: "xai_api_key", placeholder: "xai-..." },
  { id: "cerebras", name: "Cerebras", keyField: "cerebras_api_key", placeholder: "csk-..." },
  { id: "cometapi", name: "CometAPI", keyField: "cometapi_api_key", placeholder: "sk-..." },
  { id: "tokenrouter", name: "TokenRouter", keyField: "tokenrouter_api_key", placeholder: "sk-..." },
  { id: "perplexity", name: "Perplexity", keyField: "perplexity_api_key", placeholder: "pplx-..." },
  { id: "firecrawl", name: "Firecrawl", keyField: "firecrawl_api_key", placeholder: "fc-..." },
];

export const PROVIDER_OPTIONS = [
  { id: "lovable", name: "Lovable Gateway" },
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic (Claude)" },
  { id: "gemini", name: "Google Gemini" },
  { id: "openrouter", name: "OpenRouter" },
  { id: "xai", name: "xAI (Grok)" },
  { id: "cerebras", name: "Cerebras" },
  { id: "cometapi", name: "CometAPI" },
  { id: "tokenrouter", name: "TokenRouter" },
  { id: "perplexity", name: "Perplexity" },
];

// User-defined OpenAI-compatible providers, added via the Admin UI.
// Unlimited count — stored in site_settings.custom_ai_providers.
// Its API key is stored under `${id}_api_key` / `${id}_api_key_2`.
export interface CustomProvider {
  id: string;
  name: string;
  base_url: string;
  default_model?: string;
  models?: string[];
}

export const FEATURES = [
  { id: "ai_chat", label: "AI Chat", desc: "Chatbot tư vấn" },
  { id: "ai_search", label: "AI Search", desc: "Tìm kiếm thông minh" },
  { id: "blog_generation", label: "Blog Generation", desc: "Tạo bài viết blog" },
  { id: "tool_article", label: "Tool Article", desc: "Bài giới thiệu công cụ" },
  { id: "review_generation", label: "Review Generation", desc: "Tạo review tự động" },
  { id: "workflow_generation", label: "Workflow Generation", desc: "Tạo workflow" },
  { id: "translation", label: "Translation", desc: "Dịch nội dung" },
  { id: "content_generation", label: "Content (Fallback)", desc: "Fallback chung" },
];

export const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--accent))",
];

export interface FeatureConfig {
  provider: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export function parseFeatureConfig(raw: any): FeatureConfig {
  if (!raw) return { provider: "lovable" };
  if (typeof raw === "string") return { provider: raw };
  return { provider: raw.provider || "lovable", model: raw.model, temperature: raw.temperature, max_tokens: raw.max_tokens };
}

export interface DeepTestResult {
  success: boolean;
  reply?: string;
  model?: string;
  duration_ms?: number;
  error?: string;
}
