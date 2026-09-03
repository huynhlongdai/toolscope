# AI HANDOFF — ToolScope

> **Đọc file này trước bất kỳ thao tác nào.** File này viết cho một AI coding
> assistant khác (Claude Code, Cursor, GPT, v.v.) chưa từng thấy project này,
> để nó hiểu đủ context và có thể tiếp tục phát triển / deploy ngay mà không
> cần hỏi lại người dùng những điều đã biết.

## 1. Đây là gì?

**ToolScope** — một **content-first affiliate site** về AI tools: bài viết
review/listicle/case-study là nguồn traffic/SEO chính, thư mục công cụ
(directory) là phần hỗ trợ. Kiếm tiền qua affiliate link (`rel=sponsored`).

- **KHÔNG phải** project Hono/Cloudflare Workers (dù đó là stack "default"
  của nhiều môi trường sandbox AI). Đây là project **Lovable-generated**:
  React SPA thuần, build ra static file, serve qua Nginx hoặc bất kỳ static
  host nào (Vercel/Netlify/Cloudflare Pages ở dạng static-only cũng được,
  miễn có SPA fallback).
- Backend **100% là Supabase** (Postgres + RLS + Auth + Storage + 22 Edge
  Functions). Không có server Node.js riêng nào ngoài Vite dev/preview.

## 2. Tech stack chính xác

| Layer | Công nghệ |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 + shadcn-ui (Radix) + Tailwind CSS |
| Router | react-router-dom v6 |
| Data fetching | @tanstack/react-query v5 |
| Backend/DB | Supabase (Postgres, RLS, Auth, Storage, Edge Functions/Deno) |
| Rich text editor | Tiptap |
| Markdown render | react-markdown |
| Sanitize HTML | dompurify |
| i18n | custom (`src/lib/i18n.tsx`, key trong `src/i18n/en.ts` / `vi.ts`) |
| Test | vitest + @testing-library/react |
| Container (optional) | Dockerfile 2-stage (build Vite → serve bằng Nginx) |

**KHÔNG dùng**: Next.js, Hono, Cloudflare Workers/D1/KV, Express, Prisma.

## 3. Cấu trúc thư mục quan trọng

```
toolscope/
├── src/
│   ├── pages/                    # Route-level pages (ToolDetail.tsx, BlogPage.tsx, admin/*, ...)
│   ├── components/
│   │   ├── tool-detail/          # QuickVerdictCard, QuickFactsStrip, DetailedArticle,
│   │   │                         # StickyMobileCTA, VendorResponse, VendorClaimButton, ...
│   │   ├── blog/                 # VerdictBox, ListicleItem, CaseStudyStats, ToolsUsedSidebar
│   │   ├── deals/                # DealsSection, DealCard, DealsWidget
│   │   ├── layout/                # Header, Footer
│   │   └── ui/                    # shadcn-ui primitives (không sửa trừ khi cần)
│   ├── lib/
│   │   ├── database.ts           # ⚠️ QUAN TRỌNG — xem mục 4 bên dưới
│   │   ├── auth.tsx
│   │   ├── i18n.tsx
│   │   └── favicon.ts
│   ├── services/tools.ts         # fetchToolBySlug, fetchToolReviews, ...
│   ├── hooks/                     # useFollow, useModules, useAdminAuth, useTranslatedContent
│   └── integrations/supabase/     # KHÔNG dùng trực tiếp — xem alias ở mục 4
├── supabase/
│   ├── migrations/                 # 55 file .sql, chạy tuần tự = schema hiện tại
│   ├── functions/                  # 22 Edge Functions (Deno), xem mục 6
│   ├── seed.sql                    # seed cơ bản: 1 author, 4 category, 8 tool, 5 blog post mẫu
│   ├── seed_demo_data.sql          # seed demo: reviews/deals/comments/QA/screenshots/alternatives
│   └── seed_detailed_content.sql   # seed detailed_content cho jasper-ai + midjourney
├── .env                            # project Supabase CŨ (pzwtcburehrbxfangtzc) — không dùng nữa
├── .env.local                      # ⚠️ project Supabase ĐANG DÙNG (yntzlkzckvxlfrrqmmwm), override .env
├── ecosystem.config.cjs            # PM2 config để chạy `vite preview` (KHÔNG phải wrangler)
├── Dockerfile / nginx.conf         # để containerize khi deploy production
└── README.md                       # lịch sử thay đổi, đọc thêm để biết chi tiết từng phase
```

## 4. ⚠️ BẪY QUAN TRỌNG NHẤT: Supabase client alias

`vite.config.ts` có:
```ts
resolve: {
  alias: {
    "@/integrations/supabase/client": path.resolve(__dirname, "./src/lib/database.ts"),
    "@": path.resolve(__dirname, "./src"),
  },
}
```

Nghĩa là: **mọi import `@/integrations/supabase/client` trong toàn bộ
codebase thực chất resolve tới `src/lib/database.ts`**, KHÔNG phải file thật
tại `src/integrations/supabase/client.ts` (file đó tồn tại — do Lovable
scaffold — nhưng bị alias đè, không được dùng ở runtime).

`src/lib/database.ts` export `supabase` client được build qua `buildClient()`,
hỗ trợ 2 chế độ:
- **"local"**: dùng `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` từ
  `.env.local` (ưu tiên) hoặc `.env`.
- **"external"**: project Supabase khác do người dùng cấu hình qua UI, lưu
  trong `localStorage` key `active_db`.

→ Nếu bạn cần trace bug liên quan Supabase, luôn đọc `src/lib/database.ts`
trước, đừng mất thời gian đọc `src/integrations/supabase/client.ts`.

## 5. Database: project Supabase đang dùng

- **Project ref hiện tại**: `yntzlkzckvxlfrrqmmwm`
- **URL**: `https://yntzlkzckvxlfrrqmmwm.supabase.co`
- **File cấu hình**: `.env.local` (KHÔNG commit git, có sẵn trong archive vì
  chỉ chứa anon/publishable key — an toàn để expose ra frontend, được bảo vệ
  bằng RLS).
- **Project cũ** `pzwtcburehrbxfangtzc` (trong `.env`) — không còn dùng,
  giữ lại chỉ để tham khảo/rollback nếu cần.
- **55 migration** trong `supabase/migrations/` đã áp dụng tuần tự (bằng
  `supabase db query --linked -f <file>` hoặc `psql` qua connection pooler)
  — đây LÀ schema hiện tại của DB thật, không phải chỉ là file mẫu.
- **Muốn setup 1 project Supabase MỚI từ đầu** (ví dụ người dùng có Supabase
  account riêng):
  ```bash
  npx supabase login   # hoặc set SUPABASE_ACCESS_TOKEN
  npx supabase link --project-ref <new-project-ref>
  # Áp toàn bộ 55 migration theo thứ tự tên file (đã đúng thứ tự thời gian):
  for f in supabase/migrations/*.sql; do
    npx supabase db query --linked -f "$f" || break
  done
  # Seed cơ bản (bắt buộc để có category/tool mẫu):
  npx supabase db query --linked -f supabase/seed.sql
  # Seed demo data đầy đủ (khuyến nghị để test UI có data thật):
  npx supabase db query --linked -f supabase/seed_demo_data.sql
  npx supabase db query --linked -f supabase/seed_detailed_content.sql
  # Deploy Edge Functions:
  npx supabase functions deploy
  # Set secrets AI (bắt buộc để các function AI/collect hoạt động):
  npx supabase secrets set LOVABLE_API_KEY=... FIRECRAWL_API_KEY=...
  ```
  Rồi cập nhật `.env.local` với URL + anon key của project mới.

  **`supabase db query --linked -f <file>` chạy SQL với quyền `postgres`
  qua Supabase Management API — bypass RLS hoàn toàn.** Cần biến môi trường
  `SUPABASE_ACCESS_TOKEN` (Personal Access Token, tạo tại Supabase Dashboard
  → Account → Access Tokens). KHÔNG dùng `wrangler`/Cloudflare CLI ở đây.

- **RLS**: đang bật đầy đủ theo migration. Đọc migration files nếu cần biết
  policy chi tiết cho từng bảng trước khi thêm feature mới có ghi/đọc dữ liệu.

## 6. Edge Functions (22 function, Deno runtime)

Nằm trong `supabase/functions/`, mỗi folder = 1 function, deploy bằng
`npx supabase functions deploy <name>` hoặc deploy tất cả cùng lúc bằng
`npx supabase functions deploy`.

**Secrets bắt buộc** (set qua `npx supabase secrets set KEY=value`):
- `LOVABLE_API_KEY` — dùng cho các function AI-generation: `bulk-collect-tools`,
  `collect-ai`, `collect-tool-data`, `enrich-trial-info`, `generate-ai-score`,
  `generate-review`, `generate-blog-post`, `generate-tool-article`,
  `generate-workflow`, `ai-chat`, `ai-search` (qua `_shared/ai-provider.ts`).
- `FIRECRAWL_API_KEY` — dùng cho các function crawl web: `collect-ai`,
  `collect-deals`, `collect-tool-data`, `enrich-trial-info`.
- Không cần set `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY`
  thủ công — Supabase tự inject các biến này cho mọi Edge Function.
- `setup-external-db` dùng `EXTERNAL_SUPABASE_*` — chỉ liên quan tính năng
  cho phép user tự trỏ app sang Supabase project khác của họ (không phải
  secret cấu hình cố định).

**Function không cần AI key** (chạy được ngay không cần set gì thêm):
`sitemap`, `manage-ai-keys`, `sync-database`, `check-tool-health`,
`scheduled-collect`, `analyze-search-patterns`, `translate-*` (dùng OpenAI
key riêng cấu hình qua `manage-ai-keys`, không phải secret cố định).

## 7. Chạy local / deploy

```bash
npm install
npm run build
# Chạy dev (hot reload):
npm run dev              # Vite dev server, port 8080
# Hoặc chạy như production preview (dùng bởi PM2 trong sandbox gốc):
npx vite preview --host 0.0.0.0 --port 3000
# hoặc: pm2 start ecosystem.config.cjs
```

**Deploy production**: đây là SPA static, có thể deploy lên BẤT KỲ static
host (Vercel, Netlify, Cloudflare Pages static, S3+CloudFront, VPS+Nginx...).
Yêu cầu duy nhất: **SPA fallback route** (`mọi path lạ → index.html`) vì
dùng react-router-dom client-side routing. Xem `nginx.conf` làm ví dụ mẫu
(có SPA fallback + gzip + cache static assets + reverse-proxy `/sitemap.xml`
sang Edge Function `sitemap`).

`Dockerfile` có sẵn (2-stage: build Vite → Nginx serve) — dùng được ngay
với `docker build -t toolscope . && docker run -p 80:80 toolscope`.

**Biến môi trường cần set ở host** (build-time, vì Vite inline vào bundle):
```
VITE_SUPABASE_URL="https://yntzlkzckvxlfrrqmmwm.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon key, xem .env.local>"
```

## 8. Bug pattern đã gặp — LƯU Ý cho AI tương lai

**PostgREST embedded select cần FK constraint thật.** Cú pháp
`select("*, profiles:some_id(display_name)")` (dùng ở nhiều nơi: `VendorResponse.tsx`,
`VendorClaimButton.tsx`, v.v.) CHỈ hoạt động nếu Postgres có FK constraint
thật từ `some_id` → `profiles(id)`. Thiếu FK → PostgREST trả `HTTP 400`
`{code: "PGRST200", message: "Could not find a relationship between ..."}`.

Đã fix 4 cột bị thiếu FK (xem 2 migration cuối trong `supabase/migrations/`):
`vendor_responses.vendor_id`, `vendor_claims.user_id`, `launch_comments.user_id`,
`reports.reporter_id`. **Nếu bạn thêm bảng/cột mới có query embedded select
kiểu này, luôn nhớ thêm FK constraint tương ứng ngay từ đầu.**

## 9. Trạng thái hiện tại (tính đến commit mới nhất)

- ✅ 8 tool thật (jasper-ai, copy-ai, writesonic, midjourney, github-copilot,
  cursor, notion-ai, zapier) có đủ demo data: reviews, deals, comments, Q&A,
  screenshots, alternatives.
- ✅ `jasper-ai` và `midjourney` có `detailed_content` mẫu (test được
  component `DetailedArticle`/`MidArticleCTA`).
- ✅ 22/22 Edge Function đã deploy ACTIVE trên project `yntzlkzckvxlfrrqmmwm`.
- ⚠️ Secret `LOVABLE_API_KEY` / `FIRECRAWL_API_KEY` **có thể chưa được set**
  trên project hiện tại — kiểm tra bằng `npx supabase secrets list` trước
  khi gọi các function AI/collect, nếu thiếu thì set theo mục 6.
- ⚠️ Chưa deploy production thật (chỉ chạy preview trong sandbox dev).
- Chi tiết đầy đủ từng phase phát triển: xem `README.md`.

## 10. Việc gợi ý làm tiếp (chưa làm)

1. Set 2 secret AI còn thiếu (nếu chưa set) để bật các Edge Function AI/collect.
2. Deploy production thật lên 1 static host + set env var build-time.
3. Regenerate `src/integrations/supabase/types.ts` bằng
   `npx supabase gen types typescript --project-id yntzlkzckvxlfrrqmmwm` để
   TypeScript biết đủ cột mới (`article_type`, `verdict_*`, `listicle_items`,
   `case_study_*`, `detailed_content`, v.v.) — hiện code dùng `as any` ở vài
   điểm để né lỗi type.
4. Nhập nội dung thật thay data mẫu (8 tool demo hiện tại là ví dụ, chưa phải
   nội dung production).
