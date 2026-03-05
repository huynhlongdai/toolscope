

## Kiểm tra Plan - Các hạng mục chưa triển khai

Sau khi rà soát toàn bộ codebase đối chiếu với plan, dưới đây là những gì **đã xong** và **chưa xong**:

### Đã triển khai (confirmed in code)
- Trang chủ, Tools, Chi tiết tool, Categories, Trending, Blog, Compare, Collections, Bookmarks, Profile, Workflows, Deals, Tasks, Launches, Leaderboard
- Auth + Roles (user_roles table, has_role function)
- AI Search, AI Chat, AI Collect, AI Generate Review/Article/Blog, AI Score, Translate
- Structured Review Form, Alternatives Section, G2 Grid Chart, Screenshot Gallery
- Vendor Profiles (claim + respond to reviews) - *done but backlog not updated*
- SEO: JSON-LD, sitemap edge function, canonical URLs, OG tags
- Mobile bottom nav, dark/light mode, i18n selector
- Admin: Dashboard, Tools, Users, Reviews, Moderation, Blog, Categories, Menus, Pages, Collect AI, Workflows, Search Analytics, Deals, Launches, Tasks

### Chưa triển khai - cần bổ sung

**1. Analytics / Tracking Script** (user đặc biệt yêu cầu)
- Chưa có Google Analytics, Microsoft Clarity, hoặc bất kỳ tracking script nào
- Cần: Admin có thể cấu hình GA Measurement ID + các script tracking tùy ý
- Bảng `site_settings` lưu GA ID, custom scripts
- Component `AnalyticsProvider` inject script vào `<head>`
- Page view tracking tự động khi navigate

**2. SEOHead thiếu hreflang + twitter:card**
- `SEOHead` chưa output hreflang tags cho đa ngôn ngữ
- Thiếu `twitter:card`, `twitter:title`, `twitter:description` meta tags

**3. Newsletter / Email Digest**
- Plan ghi "Newsletter đăng ký email weekly digest" nhưng chưa có
- Cần form subscribe ở Footer + bảng `newsletter_subscribers`

**4. Audit Log**
- Plan ghi "Audit log mọi thao tác admin/editor" nhưng bảng `audit_logs` chưa tồn tại

**5. Reports / Spam reporting**
- Plan ghi bảng `reports` trong database tables nhưng chưa có
- Nút "Báo cáo spam" trên comments/reviews chưa triển khai

**6. Plan.md backlog cần cập nhật**
- Vendor/Maker Profiles đã triển khai nhưng vẫn nằm trong backlog

---

### Kế hoạch triển khai

**Migration SQL:**
- Tạo bảng `site_settings` (key text PK, value jsonb) - lưu GA ID, custom head/body scripts
- Tạo bảng `newsletter_subscribers` (id, email unique, subscribed_at, is_active)
- Tạo bảng `audit_logs` (id, user_id, action, entity_type, entity_id, details jsonb, created_at)
- Tạo bảng `reports` (id, reporter_id, target_type, target_id, reason, status, created_at)
- RLS: site_settings readable by all / manageable by admin; newsletter insertable by anyone; audit_logs admin only; reports insertable by authenticated + admin manages

**Frontend changes:**

1. **`src/components/analytics/AnalyticsProvider.tsx`** - Component wrap App, reads `site_settings` for GA ID + custom scripts, injects them into `<head>`, tracks page views on route change via `useLocation()`

2. **`src/components/seo/SEOHead.tsx`** - Add hreflang tags + twitter meta tags

3. **`src/components/layout/Footer.tsx`** - Add newsletter subscribe form

4. **`src/pages/admin/AdminSettings.tsx`** - New admin page for site settings: GA Measurement ID input, custom `<head>` scripts textarea, custom `<body>` scripts textarea

5. **Admin routing** - Add `/admin/settings` route + sidebar link

6. **Update `.lovable/plan.md`** - Move Vendor Profiles from backlog to completed

### Tệp thay đổi
- 1 migration SQL (4 tables)
- Create: `src/components/analytics/AnalyticsProvider.tsx`, `src/pages/admin/AdminSettings.tsx`
- Edit: `src/components/seo/SEOHead.tsx`, `src/components/layout/Footer.tsx`, `src/App.tsx`, `src/components/admin/AdminLayout.tsx`, `.lovable/plan.md`

