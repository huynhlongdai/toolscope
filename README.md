# ToolScope

## Tổng quan
- **Mục tiêu**: Chuyển ToolScope từ "AI tools directory" thành **content-first affiliate site** — bài viết (review, listicle, case study, comparison) là nguồn traffic/SEO chính, thư mục công cụ là phần hỗ trợ phía sau. Kiếm tiền qua affiliate link.
- **Định hướng thiết kế đã chốt**: Teal/Cyan làm màu chủ đạo (`--primary`), Hero/Listicle-header/Case-study-stats dùng nền tối "hero-surface" theo Mockup 4/5/6 đã duyệt.
- **Stack**: React + Vite + TypeScript + shadcn-ui + Tailwind, Supabase (Postgres + RLS, Auth, Edge Functions).

## Đã hoàn thành (Phase 1 — "4-5-6")
1. **Design tokens** (`src/index.css`, `tailwind.config.ts`): `--primary` đổi sang teal/cyan (174 80% 38%), `--accent` chuyển thành violet phụ trợ. Thêm bộ token riêng cho khu vực "hero" luôn tối (`--hero-*`, class `.hero-surface`, `.hero-grid-bg`, `.text-gradient-hero`) + `rankGold` cho ribbon "Best Overall" + animation `glow-pulse`.
2. **DB migration** (`supabase/migrations/20260310170000_...sql`): thêm `article_type` enum, `primary_tool_id`, `cta_label`, `has_affiliate_links`, các field Verdict Box (`verdict_rating/summary/pros/cons/best_for`), `listicle_items` (jsonb), `case_study_stats` + `case_study_tools_used` (jsonb) vào `blog_posts`. ✅ **Đã áp dụng lên Supabase local** (xem mục "Database local" bên dưới).
3. **Component mới** (`src/components/blog/`): `VerdictBox`, `ListicleItem`, `CaseStudyStats`, `ToolsUsedSidebar`, `AffiliateDisclosure`.
4. **`BlogDetail.tsx`**: branch render theo `article_type` (review → VerdictBox, listicle → danh sách ListicleItem có CTA riêng, case_study → CaseStudyStats + ToolsUsedSidebar). Có **graceful fallback**: nếu cột DB chưa tồn tại, tự suy luận loại bài từ tags/title để trang vẫn chạy được ngay.
5. **`HeroSection.tsx`**: nền tối teal/cyan/blue glow (Mockup 4), badge/typewriter/search giữ nguyên logic, chỉ đổi màu.
6. **`Index.tsx`**: đổi thứ tự section — Reviews & Guides (BlogPreview) lên ngay dưới Hero, thư mục (CategoryGrid) đẩy xuống cuối, đúng chiến lược content-first.
7. **`Header.tsx`**: nav đổi thành Reviews / Best Tools / Use Cases / Compare / Deals / Explore.
8. **`BlogPage.tsx`**: đổi thành hub "Reviews & Guides" với tab filter theo `article_type` (?type=review|listicle|case_study|comparison|howto), badge loại bài trên mỗi card.
9. **i18n**: thêm đầy đủ key mới cho en.ts/vi.ts (verdict.*, listicle.*, caseStudy.*, affiliate.disclosure, blog.filter*).

## Database local (Supabase self-hosted qua Docker) — MỚI
Vì sandbox chỉ có anon/publishable key (read-only theo RLS) trên Supabase production, không thể chạy migration hay ghi `site_settings`, nên đã dựng **Supabase local dev stack** bằng Docker để có full quyền đọc/ghi:

- **Cách bật**: `dockerd` chạy qua `sudo dockerd &`, sau đó `sudo npx supabase start` (đã chạy — 5 container thiết yếu đang `Up`: `db`, `kong`, `auth`, `rest`, `storage`). Các container không cần cho app hiện tại (`studio`, `realtime`, `analytics`, `vector`, `pg_meta`, `inbucket`) đã **stop** để tiết kiệm RAM (sandbox chỉ có 1.9GB) — bật lại bằng `sudo docker start <container_name>` nếu cần dùng Studio UI hoặc Realtime.
- **App đang trỏ vào local DB**: file `.env.local` (Vite tự động ưu tiên hơn `.env`, đã có trong `.gitignore`) chứa:
  ```
  VITE_SUPABASE_URL="http://127.0.0.1:54321"
  VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
  ```
  Muốn chuyển lại về production: xóa file `.env.local` rồi `npm run build` lại (`.env` gốc vẫn giữ nguyên URL/key production).
- **Migration đã áp dụng**: tất cả file trong `supabase/migrations/` (bao gồm migration `article_type`/`verdict_*`/`listicle_items`/`case_study_*` ở mục 2 trên) đã chạy tự động khi `supabase start` khởi tạo DB local — đã verify bằng `\d blog_posts` thấy đủ cột mới.
- **Đã tắt Tasks/Launches/Workflows/Leaderboard**: ghi trực tiếp `site_settings.modules_config = {"tasks": false, "launches": false, "workflows": false, "leaderboard": false}` qua `psql` (superuser, bypass RLS) — việc trước đây bị chặn khi dùng anon key trên production giờ đã hoạt động trên local.
- **Seed data** (`supabase/seed.sql`, chạy 1 lần bằng `psql < supabase/seed.sql`): 1 tác giả editorial, 4 category, 8 tool mẫu (Jasper AI, Copy.ai, Writesonic, Midjourney, GitHub Copilot, Cursor, Notion AI, Zapier), và **5 bài blog mẫu — mỗi `article_type` một bài** để test đủ 3 layout mới:
  - `jasper-ai-review-2026` → **review** (VerdictBox: rating 4.5, pros/cons, CTA)
  - `top-5-ai-writing-tools-2026` → **listicle** (3 ListicleItem, rank #1 có ribbon vàng)
  - `startup-mvp-10-days-ai-coding-tools` → **case_study** (CaseStudyStats 4 chỉ số + ToolsUsedSidebar 3 tool)
  - `cursor-vs-github-copilot-2026` → **comparison**
  - `automate-content-workflow-ai-5-steps` → **howto**
- **Đã build + test lại thành công** trên local DB: `npm run build` OK, PM2 restart OK, `curl` 200 trên `/`, `/blog`, và toàn bộ 5 URL bài viết mẫu trên. REST API (`/rest/v1/blog_posts`) trả đúng cấu trúc `verdict_*`/`listicle_items`/`case_study_stats` như component mong đợi.
- **Lưu ý RAM**: chạy `npm run build` cùng lúc với full Docker stack (11 container) có thể làm sandbox treo do hết RAM (1.9GB). Nếu cần build lại, ưu tiên giữ container `db`/`kong`/`auth`/`rest`/`storage` chạy, các container khác nên tắt trước khi build.

## Còn thiếu / cần làm tiếp
- **Đồng bộ lên production**: khi sẵn sàng lên thật, cần (a) chạy migration `20260310170000_...sql` trên Supabase production (SQL Editor hoặc `supabase db push` với service role/DB password), (b) tắt Tasks/Launches/Workflows/Leaderboard qua Admin Dashboard → Settings → Modules (vì production vẫn chỉ có anon key read-only), (c) nhập nội dung bài viết thật (không phải data mẫu) cho các `article_type`.
- **ToolDetail.tsx**: chưa áp style Mockup B/3 (light, data-dense trust-tech) — nằm ngoài phạm vi "4-5-6" lần này, có thể làm ở Phase 2.
- Viết nội dung tiếng Anh thực tế (review/listicle/case-study) bằng AI theo 3 niche đã chọn, thay cho data mẫu hiện tại.
- Cân nhắc regenerate `src/integrations/supabase/types.ts` (`npx supabase gen types typescript --local`) để TypeScript biết đủ các cột mới của `blog_posts` (hiện code vẫn chạy được nhờ ép kiểu `as any` ở vài điểm).

## Chạy local
```bash
cd /home/user/toolscope

# (Nếu muốn dùng lại Supabase local đã dựng, đảm bảo Docker daemon đang chạy)
sudo dockerd > /tmp/dockerd.log 2>&1 &   # chỉ cần nếu daemon chưa chạy
sudo npx supabase status                 # kiểm tra / lấy URL + key local

npm run build
pm2 start ecosystem.config.cjs
curl http://localhost:3000
```

## Deploy
- Chưa deploy production (Lovable/Vite project, không dùng Cloudflare Pages). `.env` (production) và `.env.local` (local dev, override) đều đã có trong `.gitignore`, không commit lên git.
