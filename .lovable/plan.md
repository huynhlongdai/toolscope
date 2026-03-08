

## Nâng cấp toàn diện hệ thống AI Provider

Gộp 2 plan đã duyệt: (1) Multi-key rotation + per-feature model selection + advanced params, (2) Bổ sung 4 provider mới (Anthropic, OpenRouter, xAI, Cerebras).

---

### Thay đổi tổng hợp

#### 1. `supabase/functions/_shared/ai-provider.ts`

**Thêm 4 providers mới** vào endpoints + default models:
- `anthropic` → `https://api.anthropic.com/v1/messages` / `claude-sonnet-4-20250514`
- `openrouter` → `https://openrouter.ai/api/v1/chat/completions` / `google/gemini-2.5-flash`
- `xai` → `https://api.x.ai/v1/chat/completions` / `grok-3-mini`
- `cerebras` → `https://api.cerebras.ai/v1/chat/completions` / `llama-4-scout-17b-16e-instruct`

**Mở rộng AIProviderConfig** từ 3 → 8 features:
`ai_chat`, `ai_search`, `blog_generation`, `tool_article`, `review_generation`, `workflow_generation`, `translation`, `content_generation` (fallback)

**Per-feature config object** — mỗi feature có thể là string (backward compat) hoặc object:
```json
{ "provider": "openai", "model": "gpt-4o", "temperature": 0.8, "max_tokens": 4096 }
```

**Multi-key rotation** — `getApiKey()` thử primary key → backup key (`_2` suffix) → Lovable fallback

**Anthropic adapter** — `callAnthropicProvider()` riêng: header `x-api-key` + `anthropic-version`, body format `system` tách riêng, response convert `content[0].text` → OpenAI format

**AIKeys interface** mở rộng: thêm `anthropic_api_key`, `openrouter_api_key`, `xai_api_key`, `cerebras_api_key` + backup keys (`*_2`)

#### 2. `supabase/functions/manage-ai-keys/index.ts`

**Test endpoints** thêm 4 provider mới:
- `anthropic` → GET `https://api.anthropic.com/v1/models` với `x-api-key`
- `openrouter` → GET `https://openrouter.ai/api/v1/models` với Bearer
- `xai` → GET `https://api.x.ai/v1/models` với Bearer
- `cerebras` → GET `https://api.cerebras.ai/v1/models` với Bearer

**Action `get`** — trả về thêm danh sách available models per provider (hardcoded catalog)

#### 3. `src/pages/admin/AdminSettings.tsx`

**AI_PROVIDERS** thêm 4 entries: Anthropic, OpenRouter, xAI (Grok), Cerebras

**FEATURES** mở rộng 3 → 8 features với labels rõ ràng:
- AI Chat, AI Search, Blog Generation, Tool Article, Review Generation, Workflow Generation, Translation, Content Generation (fallback)

**Per-feature config UI** — mỗi feature row gồm:
- Select Provider (9 options: Lovable + 8 providers)
- Select Model (dynamic list theo provider)
- Slider Temperature (0-1, step 0.1)
- Input Max Tokens
- Reset button

**Multi-key UI** — Mỗi provider có nút "Thêm key backup", hiện badge Primary/Backup

#### 4. Cập nhật 8 Edge Functions — đổi feature ID

| Edge Function | Cũ | Mới |
|---|---|---|
| `generate-blog-post` | `content_generation` | `blog_generation` |
| `generate-tool-article` | `content_generation` | `tool_article` |
| `generate-review` | `content_generation` | `review_generation` |
| `generate-workflow` | `content_generation` | `workflow_generation` |
| `translate-tool` | `content_generation` | `translation` |
| `translate-blog` | `content_generation` | `translation` |
| `translate-menu` | `content_generation` | `translation` |
| `translate-system-keys` | `content_generation` | `translation` |
| `ai-chat` | `ai_chat` | giữ nguyên |
| `ai-search` | `ai_search` | giữ nguyên |

---

### Files chỉnh sửa (12 files)

1. `supabase/functions/_shared/ai-provider.ts` — 4 providers + 8 features + multi-key + Anthropic adapter + per-feature params
2. `supabase/functions/manage-ai-keys/index.ts` — 4 test endpoints + model catalog
3. `src/pages/admin/AdminSettings.tsx` — UI hoàn chỉnh: 9 providers, 8 features, model selection, temperature/max_tokens, backup keys
4. `supabase/functions/generate-blog-post/index.ts` — feature → `blog_generation`
5. `supabase/functions/generate-tool-article/index.ts` — feature → `tool_article`
6. `supabase/functions/generate-review/index.ts` — feature → `review_generation`
7. `supabase/functions/generate-workflow/index.ts` — feature → `workflow_generation`
8. `supabase/functions/translate-tool/index.ts` — feature → `translation`
9. `supabase/functions/translate-blog/index.ts` — feature → `translation`
10. `supabase/functions/translate-menu/index.ts` — feature → `translation`
11. `supabase/functions/translate-system-keys/index.ts` — feature → `translation`
12. `supabase/functions/analyze-search-patterns/index.ts` — giữ `ai_search` (không đổi, chỉ cần tương thích config mới)

