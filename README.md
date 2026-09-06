# Astute Tools

> ⚠️ **Đổi thương hiệu (2026-09-06)**: Site đã đổi tên từ **ToolScope** sang **Astute Tools**, domain chính thức **`astute.tools`**. Logo mới (gear + wrench mark, màu indigo `#6366f1`) tại `public/logo-icon.png` (icon đơn) và `public/og-image.png` (banner social-share); bản gốc/độ phân giải cao lưu ở `public/brand/`. Đã cập nhật: `Header`/`Footer`/`AdminLayout`/`AIChatWidget` (UI), toàn bộ `meta`/`og`/`twitter` tag trong `index.html`, `manifest.json`, `favicon.ico`/`apple-touch-icon.png`, `BASE_URL` trong edge function `sitemap` (→ `https://astute.tools`), các key `localStorage` (`astute-tools-theme`) và tên file export backup/settings (`astute-tools-backup.json`, `astute-tools-settings.json`). Các đoạn ghi chú lịch sử bên dưới nói về "ToolScope"/`admin@toolscope.com`/`toolscope.app` là nhật ký công việc tại thời điểm thực hiện, giữ nguyên để tránh sai lệch dữ liệu thật (email tài khoản admin vẫn là `admin@toolscope.com`, chưa đổi vì đây là tài khoản Supabase Auth thật đang dùng — muốn đổi email cần thao tác riêng qua Supabase Dashboard).

## Tổng quan
- **Mục tiêu**: Chuyển Astute Tools từ "AI tools directory" thành **content-first affiliate site** — bài viết (review, listicle, case study, comparison) là nguồn traffic/SEO chính, thư mục công cụ là phần hỗ trợ phía sau. Kiếm tiền qua affiliate link.
- **Định hướng thiết kế đã chốt**: Teal/Cyan làm màu chủ đạo (`--primary`), Hero/Listicle-header/Case-study-stats dùng nền tối "hero-surface" theo Mockup 4/5/6 đã duyệt.
- **Stack**: React + Vite + TypeScript + shadcn-ui + Tailwind, Supabase (Postgres + RLS, Auth, Edge Functions).

## Đã hoàn thành (Phase 1 — "4-5-6")
1. **Design tokens** (`src/index.css`, `tailwind.config.ts`): `--primary` đổi sang teal/cyan (174 80% 38%), `--accent` chuyển thành violet phụ trợ. Thêm bộ token riêng cho khu vực "hero" luôn tối (`--hero-*`, class `.hero-surface`, `.hero-grid-bg`, `.text-gradient-hero`) + `rankGold` cho ribbon "Best Overall" + animation `glow-pulse`.
2. **DB migration** (`supabase/migrations/20260310170000_...sql`): thêm `article_type` enum, `primary_tool_id`, `cta_label`, `has_affiliate_links`, các field Verdict Box (`verdict_rating/summary/pros/cons/best_for`), `listicle_items` (jsonb), `case_study_stats` + `case_study_tools_used` (jsonb) vào `blog_posts`. ✅ **Đã áp dụng lên Supabase project mới** (xem mục "Database" bên dưới).
3. **Component mới** (`src/components/blog/`): `VerdictBox`, `ListicleItem`, `CaseStudyStats`, `ToolsUsedSidebar`, `AffiliateDisclosure`.
4. **`BlogDetail.tsx`**: branch render theo `article_type` (review → VerdictBox, listicle → danh sách ListicleItem có CTA riêng, case_study → CaseStudyStats + ToolsUsedSidebar). Có **graceful fallback**: nếu cột DB chưa tồn tại, tự suy luận loại bài từ tags/title để trang vẫn chạy được ngay.
5. **`HeroSection.tsx`**: nền tối teal/cyan/blue glow (Mockup 4), badge/typewriter/search giữ nguyên logic, chỉ đổi màu.
6. **`Index.tsx`**: đổi thứ tự section — Reviews & Guides (BlogPreview) lên ngay dưới Hero, thư mục (CategoryGrid) đẩy xuống cuối, đúng chiến lược content-first.
7. **`Header.tsx`**: nav đổi thành Reviews / Best Tools / Use Cases / Compare / Deals / Explore.
8. **`BlogPage.tsx`**: đổi thành hub "Reviews & Guides" với tab filter theo `article_type` (?type=review|listicle|case_study|comparison|howto), badge loại bài trên mỗi card.
9. **i18n**: thêm đầy đủ key mới cho en.ts/vi.ts (verdict.*, listicle.*, caseStudy.*, affiliate.disclosure, blog.filter*).

## Database
App hiện đang chạy trên **Supabase project mới** `yntzlkzckvxlfrrqmmwm` (do bạn cung cấp connection string + service_role key), thay cho project cũ `pzwtcburehrbxfangtzc` (chỉ có anon/read-only key nên không áp dụng được migration/ghi `site_settings`).

- **URL**: `https://yntzlkzckvxlfrrqmmwm.supabase.co`
- **App đang trỏ vào project này** qua file `.env.local` (Vite tự động ưu tiên hơn `.env`, đã có trong `.gitignore` — **không commit lên git**):
  ```
  VITE_SUPABASE_URL="https://yntzlkzckvxlfrrqmmwm.supabase.co"
  VITE_SUPABASE_PUBLISHABLE_KEY="<anon key>"
  ```
  File `.env` gốc (project cũ) vẫn giữ nguyên, không bị đụng tới — muốn quay lại project cũ chỉ cần xóa `.env.local`.
- **Migration**: toàn bộ 53 file trong `supabase/migrations/` (bao gồm migration `article_type`/`verdict_*`/`listicle_items`/`case_study_*`) đã được áp dụng tuần tự bằng `psql` qua connection pooler (`aws-0-ap-northeast-1.pooler.supabase.com:5432`), do project chưa từng `supabase link` với Personal Access Token nên không dùng được `supabase db push`. Đã verify bằng `\d blog_posts` thấy đủ cột mới và index.
- **Đã tắt Tasks/Launches/Workflows/Leaderboard**: ghi trực tiếp `site_settings.modules_config = {"tasks": false, "launches": false, "workflows": false, "leaderboard": false}` qua `psql` với quyền superuser DB (bypass RLS).
- **Seed data** (`supabase/seed.sql`, chạy bằng `psql -f supabase/seed.sql`): 1 tác giả editorial, 4 category, 8 tool mẫu (Jasper AI, Copy.ai, Writesonic, Midjourney, GitHub Copilot, Cursor, Notion AI, Zapier), và **5 bài blog mẫu — mỗi `article_type` một bài** để test đủ 3 layout mới:
  - `jasper-ai-review-2026` → **review** (VerdictBox: rating 4.5, pros/cons, CTA)
  - `top-5-ai-writing-tools-2026` → **listicle** (3 ListicleItem, rank #1 có ribbon vàng)
  - `startup-mvp-10-days-ai-coding-tools` → **case_study** (CaseStudyStats 4 chỉ số + ToolsUsedSidebar 3 tool)
  - `cursor-vs-github-copilot-2026` → **comparison**
  - `automate-content-workflow-ai-5-steps` → **howto**
- **Đã build + test lại thành công** trên project mới: `npm run build` OK (22s), PM2 restart OK, `curl` 200 trên `/`, `/blog`, `/compare`, và toàn bộ 5 URL bài viết mẫu. Playwright xác nhận page load thành công (~9s), 0 console error trên cả 3 trang review/listicle/case-study. REST API public (`https://yntzlkzckvxlfrrqmmwm.supabase.co/rest/v1/...`) trả đúng cấu trúc `verdict_*`/`listicle_items`/`case_study_stats` như component mong đợi.
- **Supabase local Docker stack** (dựng ở phiên làm việc trước) đã **stop** vì không còn cần thiết — project mới trên cloud có đầy đủ quyền đọc/ghi nên không cần chạy local nữa. Có thể `sudo docker rm -f $(sudo docker ps -aq --filter "name=supabase_")` để dọn hẳn nếu muốn giải phóng disk.
- **MCP Supabase**: đã thêm `.mcp.json` (project-scoped) trỏ tới `project_ref=yntzlkzckvxlfrrqmmwm` — khớp với project đang dùng. Cần bạn tự chạy `claude` + `/mcp` trên máy/CLI của bạn (không phải sandbox này) để hoàn tất OAuth authenticate — sandbox không có trình duyệt tương tác cho bước này.
- **Tài khoản admin thật**: đã tạo qua Supabase Auth Admin API, email `admin@toolscope.com` (mật khẩu đã gửi riêng cho bạn, không lưu trong README) — đã gán role `admin` trong `user_roles`, đã test login thành công (nhận `access_token` hợp lệ), và đã chuyển toàn bộ `author_id` của 5 bài blog mẫu sang tài khoản này. User placeholder cũ (`admin@toolscope.local`, id `11111111-...`) đã bị xoá sạch (cascade xoá `profiles`/`user_roles` liên quan).
- **Storage buckets**: đã kiểm tra, project mới đã có sẵn đủ 3 bucket cần thiết từ migration — `editor-images` (public), `covers` (public), `collect-uploads` (private). Không cần tạo thêm gì.
- **Edge Functions — ĐÃ deploy đầy đủ ✅**: sau khi có Personal Access Token (Supabase Dashboard → Account → Access Tokens), đã `supabase link --project-ref yntzlkzckvxlfrrqmmwm` rồi `supabase functions deploy` — toàn bộ **22/22 functions ACTIVE** trên project mới (`ai-chat`, `ai-search`, `analyze-search-patterns`, `bulk-collect-tools`, `check-tool-health`, `collect-ai`, `collect-deals`, `collect-tool-data`, `enrich-trial-info`, `generate-ai-score`, `generate-blog-post`, `generate-review`, `generate-tool-article`, `generate-workflow`, `manage-ai-keys`, `scheduled-collect`, `setup-external-db`, `sitemap`, `sync-database`, `translate-blog`, `translate-menu`, `translate-system-keys`, `translate-tool`). Đã verify thực tế bằng cách gọi `GET /functions/v1/sitemap` → trả về XML sitemap đúng, đọc dữ liệu thật từ DB mới. Dashboard: https://supabase.com/dashboard/project/yntzlkzckvxlfrrqmmwm/functions
  - **Personal Access Token dùng để deploy KHÔNG được lưu trong repo/README** (chỉ dùng 1 lần trong session để `link` + `deploy`, không set làm secret vĩnh viễn ở đâu trong code).
  - **Secrets còn thiếu cho 1 số function AI/collect**: `LOVABLE_API_KEY` (dùng trong `_shared/ai-provider.ts`, `bulk-collect-tools`, `collect-ai`, `collect-tool-data`, `enrich-trial-info`, `generate-ai-score`, `generate-review`) và `FIRECRAWL_API_KEY` (dùng trong `collect-ai`, `collect-deals`, `collect-tool-data`, `enrich-trial-info`) — hiện **chưa được set** trên project mới (`supabase secrets list` chỉ thấy `SUPABASE_DB_URL`). Các function này sẽ lỗi khi được gọi cho tới khi set 2 secret này bằng: `npx supabase secrets set LOVABLE_API_KEY=... FIRECRAWL_API_KEY=... --project-ref yntzlkzckvxlfrrqmmwm`. Các function không phụ thuộc AI (`sitemap`, `manage-ai-keys`, `translate-*` dùng OpenAI key riêng qua `manage-ai-keys`, v.v.) không bị ảnh hưởng.

## Demo data (seed) cho 8 tool thật
Đã chạy 3 file seed (idempotent, chạy lại an toàn) bằng `npx supabase db query --linked -f <file>` (bypass RLS qua Management API) lên project `yntzlkzckvxlfrrqmmwm`:
- **`supabase/seed_demo_data.sql`**: 5 user demo (+ profiles), `ai_scores` (8 tool), `reviews` (15, gồm 2 review editor), `deals` (6, 1 deal cận hết hạn để test badge countdown), `comments` (8, có 2 chuỗi reply), `questions`/`answers` (6/4, mix resolved/unresolved), `tool_screenshots` (7), `tool_alternatives` (8, liên kết 2 chiều theo nhóm AI-writing/dev-tool).
- **`supabase/seed_detailed_content.sql`**: `detailed_content` (bài viết Markdown dài, nhiều section, có bảng giá + shortcode `[deal:CODE]`) cho `jasper-ai` và `midjourney` — dùng để test component `DetailedArticle`/`MidArticleCTA` (CTA giữa bài chỉ hiện khi bài có ≥4 section và có affiliate/website URL).
- Muốn chạy lại từ đầu (ví dụ sau khi reset DB): `SUPABASE_ACCESS_TOKEN=<PAT> npx supabase db query --linked -f supabase/seed_demo_data.sql` rồi tương tự với `seed_detailed_content.sql`.

**Bug đã phát hiện + fix trong lúc verify seed**: PostgREST cần **FK constraint thật** trong Postgres để resolve cú pháp embedded select `select=*,profiles:some_id(...)` — nếu thiếu FK, API trả `HTTP 400 (PGRST200) "Could not find a relationship"`. Bug này có từ migration gốc tạo bảng (`20260305121114_...sql`) nhưng chỉ lộ ra khi có dữ liệu review/comment thật (trước khi seed, các bảng rỗng nên query không chạy tới). Đã fix bằng 2 migration mới, thêm FK cho 4 cột bị thiếu:
- `20260903135900_fix_vendor_responses_vendor_id_fk.sql`: `vendor_responses.vendor_id`, `vendor_claims.user_id` → `profiles(id)` (ảnh hưởng trực tiếp trang Tool Detail, đã verify hết lỗi console).
- `20260903140500_fix_launch_comments_reports_missing_fk.sql`: `launch_comments.user_id`, `reports.reporter_id` → `profiles(id)` (ngoài phạm vi Tool Detail — module Launches đang tắt, Reports là trang Admin — fix chủ động phòng ngừa cùng lỗi khi các module này được dùng tới).

## Nâng cấp trang Admin (P0 → P3)
Sau khi research toàn bộ 24 trang admin + 55 migrations + 22 edge functions, đã triển khai một roadmap nâng cấp theo 4 nhóm ưu tiên (P0 security → P1 architecture-dedup → P2 performance → P3 product-decisions). Tất cả đã commit lên git, build + `npx vitest run` (24/24 tests) pass sau mỗi bước.

- **P0 — Security (commit `f078279`)**: tạo `supabase/functions/_shared/auth.ts` (`requireAuth()`/`requireAdmin()`), áp dụng lên 16 edge functions vốn thiếu kiểm tra quyền admin phía server. ✅ **ĐÃ deploy lên Supabase production** (`yntzlkzckvxlfrrqmmwm`) bằng `npx supabase functions deploy <16 functions> --project-ref yntzlkzckvxlfrrqmmwm` sau khi có Personal Access Token. Verify thực tế: gọi `manage-ai-keys`/`collect-ai` không kèm `Authorization` header → trả `HTTP 401` (`Missing Authorization header - login required` / `UNAUTHORIZED_NO_AUTH_HEADER`), xác nhận code mới đã live (trước đây các function này chạy không cần auth).
- **P1 — Architecture dedup**:
  - `p1-1` (`fc513b3`): `useBulkSelection<T>()` hook, áp dụng vào `AdminModeration.tsx` (bỏ 6 bộ `useState<Set<string>>` trùng lặp).
  - `p1-2` (`4d0e10a`): `src/lib/export.ts` (`exportToCSV`, `exportCSVLines`, `exportToJSON`, `dateStampedFilename`), áp dụng vào 13 trang admin, bỏ code Blob/download lặp lại.
  - `p1-3`+`p1-4` (`306f62a`): bỏ `useAdminAuth()` trùng trong `AdminLayout` (chỉ `AdminGuard` ở route-level check auth); refactor `useAdminAuth` sang React Query (`staleTime: 60s`) để cache role.
- **P2 — Performance**:
  - `p2-1` (`27c9a4d`): `AdminUsers.tsx` trước đây load **toàn bộ** `profiles`+`user_roles`+`user_warnings`+id các bảng `reviews`/`comments`/`questions` vào RAM rồi filter/đếm bằng `Array.filter()` lồng nhau (O(n×m)), chỉ phân trang bằng `.slice()` phía client sau khi đã tải hết. Đã thay bằng RPC `admin_list_users(...)` (migration `20260903150000_admin_users_paginated_rpc.sql`) — filter (search/role/ban/activity) + đếm reviews/comments/questions/warnings + `LIMIT/OFFSET` đều chạy trong Postgres, admin-gated qua `has_role()` trong function body. Thêm index cho `reviews.author_id`/`comments.user_id`/`questions.user_id`/`user_warnings.user_id` (chưa từng có index). Search debounce 300ms. Export CSV gọi lại RPC với `page_size=5000` để vẫn xuất toàn bộ dòng khớp filter (không chỉ trang hiện tại). ✅ **Migration ĐÃ apply lên production** bằng `npx supabase db push` (sau khi `migration repair --status applied` các migration cũ để đồng bộ lịch sử migration — bảng lịch sử trên remote trống vì các migration gốc từng được apply qua `psql` trực tiếp, không qua CLI). Verify: `POST /rest/v1/rpc/admin_list_users` trả `HTTP 200` (trước đó là `404 PGRST202`).
- **P3 — Product decisions**:
  - `p3-1` (`39866d6`): `AdminBackup.tsx` import JSON — thêm `validateTableRows()` kiểm tra mỗi dòng trước khi upsert (object hợp lệ + `key`/`id` đúng định dạng); dialog hiển thị số dòng không hợp lệ + lý do, disable bảng không có dòng hợp lệ nào; theo dõi lỗi upsert thực tế thay vì đếm "restored" vô điều kiện.
  - `p3-2` (`dfff380`): nút "AI Suggest" trong `AdminTasks.tsx` thực chất chỉ so khớp từ khóa (không gọi AI/LLM) — đổi tên hàm/biến/audit-action (`task_ai_suggest` → `task_auto_suggest`) và nhãn UI thành "Gợi ý tự động (từ khóa)" kèm tooltip giải thích.
- **final-1** (`9510824`): build/test tổng hợp cuối cùng (rebuild sạch + `npx vitest run` 24/24 pass).
- **Deploy P0 + apply migration P2-1 lên production**: ✅ **HOÀN TẤT** — thực hiện bằng Personal Access Token (`sbp_...`) do bạn cung cấp, dùng `npx supabase link` + `npx supabase migration repair` (đồng bộ lịch sử migration) + `npx supabase db push` (apply migration `20260903150000_admin_users_paginated_rpc.sql`) + `npx supabase functions deploy` (16 function P0). Đã verify cả 2 bằng API call thật (xem chi tiết ở mục P0/p2-1 trên).

## Còn thiếu / cần làm tiếp
- **Set secret `LOVABLE_API_KEY` và `FIRECRAWL_API_KEY`** trên project mới để các Edge Function AI/collect (generate-review, collect-ai, collect-tool-data, enrich-trial-info, generate-ai-score, collect-deals, bulk-collect-tools) hoạt động được — xem chi tiết ở mục Database trên.
- **Nhập nội dung thật**: thay data mẫu (8 tool, 5 bài blog) bằng nội dung tiếng Anh thực tế theo 3 niche đã chọn.
- **ToolDetail.tsx**: chưa áp style Mockup B/3 (light, data-dense trust-tech) — nằm ngoài phạm vi "4-5-6" lần này, có thể làm ở Phase 2.
- Cân nhắc regenerate `src/integrations/supabase/types.ts` (`npx supabase gen types typescript`, cần Personal Access Token để link project) để TypeScript biết đủ các cột mới của `blog_posts` (hiện code vẫn chạy được nhờ ép kiểu `as any` ở vài điểm).

## Chạy local
```bash
cd /home/user/toolscope
npm run build
pm2 start ecosystem.config.cjs
curl http://localhost:3000
```

## Deploy
- **Production LIVE**: `https://astute.tools` — VPS `57.155.90.49` (nginx + Let's Encrypt SSL), SSH qua `azureuser` + `~/.ssh/astute_tools_key.pem` + sudo. `.env` (project Supabase cũ) và `.env.local` (project Supabase mới đang dùng, override) đều đã có trong `.gitignore`, không commit lên git.

## Phân quyền Admin/Editor/Viewer (P0-1 → P0-5)
Xây dựng hệ thống 3 role (`admin`/`editor`/`user`) để giao 1 tài khoản editor an toàn cho AI agent hỗ trợ tạo nội dung — editor dùng được mọi tool tạo nội dung nhưng **không bao giờ tự publish được**, và bị khoá khỏi Settings/Users/Backup/Danger-Zone/API-keys.
- **P0-1/P0-2**: model phân quyền editor content-approval — editor tạo/sửa content luôn bị ép về `pending_review`, chỉ admin publish được.
- **P0-3**: RPC `publish_content(_table, _id, _publish)` (SECURITY DEFINER, admin-gated) — đường duy nhất để publish; áp dụng vào AdminTools/Blog/Workflows/Deals.
- **P0-4**: `AdminGuard` thêm `adminOnly` prop, khoá route `/admin/users`, `/admin/settings`, `/admin/audit-logs`, `/admin/backup`, `/admin/sync` chỉ admin truy cập được.
- **P0-5**: mời editor bằng email — edge function `invite-editor` (admin-gated, `supabase.auth.admin.inviteUserByEmail`) + nút "Mời Editor" trong `AdminUsers.tsx`. Deploy live lên Supabase, verify qua curl.

## Mobile UX audit (7 việc)
Audit toàn bộ site trên breakpoint mobile, phát hiện + fix 7 vấn đề: bảng admin bị tràn ngang (AdminNewsletter/AdminSync), form 2 cột bị bóp trên mobile (SubmitToolPage/ProfilePage), icon search header bị ẩn dưới `md:`, `ComparePage` bảng so sánh chuyển sang Accordion card-view trên mobile thay vì cuộn ngang, `TabsList` 4 tab bọc `overflow-x-auto` tránh vỡ layout, sidebar `ToolDetail` (`ScreenshotGallery`/`AlternativesSection`) thu gọn mặc định trên mobile (Radix `Collapsible` + `useIsMobile`) để giảm mỏi cuộn.

## Fix bug SEO production: sitemap.xml
Phát hiện `nginx.conf` (cả bản trong repo lẫn bản sống trên VPS) proxy `/sitemap.xml` về project Supabase **cũ đã ngừng dùng** (`pzwtcburehrbxfangtzc`) — request rơi qua SPA fallback, trả về HTML thay vì XML, khiến Google Search Console thấy sitemap rỗng/hỏng. Đã sửa cả 2 nơi trỏ về project đúng (`yntzlkzckvxlfrrqmmwm`), apply trực tiếp trên VPS qua SSH (backup config cũ → patch → `nginx -t` → reload), verify live trả về XML hợp lệ 27 `<url>`. Đồng thời sửa luôn `supabase/config.toml` `project_id` bị lệch (bug đã biết từ trước, chưa fix).

## Tối ưu ảnh (P2.5 OptimizedImage)
Component `OptimizedImage` (IntersectionObserver lazy-load + skeleton + fade-in + fallback khi lỗi) đã được viết sẵn nhưng chưa dùng ở đâu — đã tích hợp vào `ToolCard.tsx` (logo, lặp lại nhiều nhất toàn site), `BlogPage.tsx`/`WorkflowsPage.tsx` (ảnh cover dạng grid), và related-posts thumbnail trong `BlogDetail.tsx`. Cố tình **không** áp dụng cho ảnh cover chính của bài blog (khả năng là LCP element) để tránh làm chậm lần vẽ đầu tiên.

## Backlog còn lại (`IMPROVEMENT_PLAN.md`)
- **P1.1** Hero typewriter/floating-search, **P1.2** ToolCard hover-preview/logo-skeleton, **P1.4** Google/GitHub OAuth (cần user tạo OAuth app credentials trước).
- **P2.1** ToolsPage multi-select filter, **P2.2** search debounce/autocomplete/history, **P2.3** ComparePage tách `services/compare.ts` + export PDF.
- **P3.1** bundle splitting vendor-icons, **P3.2** virtual list ToolsPage, **P3.4** skeleton components thống nhất.
- **P4** micro-animations, illustrated empty states, dark-mode polish.
- Lưu ý: đây là backlog UI/UX riêng biệt, khác với backlog "P0→P3 admin upgrade" đã hoàn thành ở trên (cùng tên số nhưng 2 track khác nhau).
