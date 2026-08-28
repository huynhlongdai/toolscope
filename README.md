# ToolScope

## Tổng quan
- **Mục tiêu**: Chuyển ToolScope từ "AI tools directory" thành **content-first affiliate site** — bài viết (review, listicle, case study, comparison) là nguồn traffic/SEO chính, thư mục công cụ là phần hỗ trợ phía sau. Kiếm tiền qua affiliate link.
- **Định hướng thiết kế đã chốt**: Teal/Cyan làm màu chủ đạo (`--primary`), Hero/Listicle-header/Case-study-stats dùng nền tối "hero-surface" theo Mockup 4/5/6 đã duyệt.
- **Stack**: React + Vite + TypeScript + shadcn-ui + Tailwind, Supabase (Postgres + RLS, Auth, Edge Functions).

## Đã hoàn thành (Phase 1 — "4-5-6")
1. **Design tokens** (`src/index.css`, `tailwind.config.ts`): `--primary` đổi sang teal/cyan (174 80% 38%), `--accent` chuyển thành violet phụ trợ. Thêm bộ token riêng cho khu vực "hero" luôn tối (`--hero-*`, class `.hero-surface`, `.hero-grid-bg`, `.text-gradient-hero`) + `rankGold` cho ribbon "Best Overall" + animation `glow-pulse`.
2. **DB migration** (`supabase/migrations/20260310170000_...sql`): thêm `article_type` enum, `primary_tool_id`, `cta_label`, `has_affiliate_links`, các field Verdict Box (`verdict_rating/summary/pros/cons/best_for`), `listicle_items` (jsonb), `case_study_stats` + `case_study_tools_used` (jsonb) vào `blog_posts`.
   ⚠️ **Chưa áp dụng lên Supabase production** — sandbox chỉ có anon/publishable key (read-only theo RLS), không có quyền chạy ALTER TABLE. Bạn cần tự chạy file SQL này trong Supabase SQL Editor (hoặc cấp `SUPABASE_ACCESS_TOKEN`/DB password để agent chạy `supabase db push`).
3. **Component mới** (`src/components/blog/`): `VerdictBox`, `ListicleItem`, `CaseStudyStats`, `ToolsUsedSidebar`, `AffiliateDisclosure`.
4. **`BlogDetail.tsx`**: branch render theo `article_type` (review → VerdictBox, listicle → danh sách ListicleItem có CTA riêng, case_study → CaseStudyStats + ToolsUsedSidebar). Có **graceful fallback**: nếu cột DB chưa tồn tại, tự suy luận loại bài từ tags/title để trang vẫn chạy được ngay.
5. **`HeroSection.tsx`**: nền tối teal/cyan/blue glow (Mockup 4), badge/typewriter/search giữ nguyên logic, chỉ đổi màu.
6. **`Index.tsx`**: đổi thứ tự section — Reviews & Guides (BlogPreview) lên ngay dưới Hero, thư mục (CategoryGrid) đẩy xuống cuối, đúng chiến lược content-first.
7. **`Header.tsx`**: nav đổi thành Reviews / Best Tools / Use Cases / Compare / Deals / Explore.
8. **`BlogPage.tsx`**: đổi thành hub "Reviews & Guides" với tab filter theo `article_type` (?type=review|listicle|case_study|comparison|howto), badge loại bài trên mỗi card.
9. **i18n**: thêm đầy đủ key mới cho en.ts/vi.ts (verdict.*, listicle.*, caseStudy.*, affiliate.disclosure, blog.filter*).

## Còn thiếu / cần làm tiếp
- **Ẩn Tasks/Launches/Workflows/Leaderboard**: agent **không thể** ghi `site_settings.modules_config` qua anon key (RLS chặn write). Cần bạn tự vào **Admin Dashboard → Settings → Modules** để tắt các module này (mã đã sẵn sàng nhận toggle qua `useModules`, không cần sửa code thêm).
- **Áp dụng migration** lên Supabase production (xem mục 2 trên) rồi nhập dữ liệu mẫu (`article_type`, `verdict_*`, `listicle_items`, `case_study_stats/tools_used`) cho vài bài viết để thấy đầy đủ 3 layout mới trên dữ liệu thật — hiện tại đang chạy bằng suy luận từ tags/title.
- **ToolDetail.tsx**: chưa áp style Mockup B/3 (light, data-dense trust-tech) — nằm ngoài phạm vi "4-5-6" lần này, có thể làm ở Phase 2.
- Viết nội dung tiếng Anh thực tế (review/listicle/case-study) bằng AI theo 3 niche đã chọn.

## Chạy local
```bash
cd /home/user/toolscope
npm run build
pm2 start ecosystem.config.cjs
curl http://localhost:3000
```

## Deploy
- Chưa deploy production (Lovable/Vite project, không dùng Cloudflare Pages). `.env` chứa Supabase anon key/URL đã khôi phục từ git history.
