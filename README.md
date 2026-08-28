# ToolScope

## Tổng quan
- **Mục tiêu**: Chuyển ToolScope từ "AI tools directory" thành **content-first affiliate site** — bài viết (review, listicle, case study, comparison) là nguồn traffic/SEO chính, thư mục công cụ là phần hỗ trợ phía sau. Kiếm tiền qua affiliate link.
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
- **Edge Functions — CHƯA deploy được**: repo có 22 Edge Functions (`ai-chat`, `generate-blog-post`, `collect-tool-data`, `translate-*`, v.v.) nhưng `supabase functions deploy` và `supabase link` đều yêu cầu một **Supabase Personal Access Token** (credential quản lý ở cấp Account, khác hoàn toàn với DB password/service_role key đã cung cấp) — sandbox báo lỗi rõ: *"Access token not provided. Supply an access token by running `supabase login` or setting the SUPABASE_ACCESS_TOKEN environment variable."* Muốn deploy Edge Functions, cần bạn lấy token tại Supabase Dashboard → Account → Access Tokens rồi cung cấp (hoặc tự chạy `supabase login` + `supabase functions deploy` trên máy của bạn).

## Còn thiếu / cần làm tiếp
- **Deploy 22 Edge Functions lên project mới** — **đang bị chặn**, cần bạn cung cấp Supabase **Personal Access Token** (Supabase Dashboard → Account → Access Tokens), khác với DB password/service_role key đã có. Không có token này thì `supabase functions deploy`/`supabase link` không chạy được từ sandbox.
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
- Chưa deploy production (Lovable/Vite project, không dùng Cloudflare Pages). `.env` (project Supabase cũ) và `.env.local` (project Supabase mới đang dùng, override) đều đã có trong `.gitignore`, không commit lên git. Khi deploy thật cần set biến môi trường `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` trên nền tảng hosting theo giá trị trong `.env.local`.
