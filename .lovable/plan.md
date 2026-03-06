

## Plan: Hoàn thiện các module còn thiếu + Bổ sung Backup, Analytics nâng cao

### Kiểm tra hiện trạng - Đã hoàn thành

| Module | Trạng thái |
|--------|-----------|
| Admin Reports | ✅ Done |
| Admin Audit Logs | ✅ Done |
| Admin Newsletter (+ Export CSV) | ✅ Done |
| Admin Translations | ✅ Done |
| AI Provider Keys + Provider Selection | ✅ Done |
| manage-ai-keys Edge Function | ✅ Done |
| Multi-provider ai-provider.ts | ✅ Done |
| Site Info / Social / Maintenance | ✅ Done |
| Submit Tool Page | ✅ Done |
| Edit Profile | ✅ Done |
| Forgot Password | ✅ Done |
| Enhanced Dashboard (stats + quick actions + activity) | ✅ Done |
| Pagination ToolsPage | ✅ Done |
| Pagination + Export CSV AdminTools | ✅ Done |
| Pagination + Export CSV AdminUsers | ✅ Done |
| Report buttons on Comments/Reviews | ✅ Done |
| Edge functions multi-provider update | ✅ Done |

### Còn thiếu (phát hiện khi kiểm tra)

| Module | Vấn đề |
|--------|--------|
| Pagination AdminReviews | Chưa có - load tất cả |
| Pagination AdminBlog | Chưa có - load tất cả |
| Export CSV AdminReviews | Chưa có |
| Export CSV AdminBlog | Chưa có |
| useAuditLog chưa tích hợp | Hook tồn tại nhưng chưa gọi trong admin pages |
| Google OAuth | Chưa triển khai (cần cấu hình provider) |
| Backup Database | Chưa có |
| Backup hệ thống (export/import settings) | Chưa có |
| Analytics nâng cao (user analytics, content analytics) | Dashboard chỉ có stats cơ bản |

### Bổ sung mới theo yêu cầu

---

### 1. Admin Backup & Restore (`/admin/backup`)

Tạo `src/pages/admin/AdminBackup.tsx`:

- **Database Export**: Nút export toàn bộ dữ liệu quan trọng (tools, categories, tags, reviews, blog_posts, site_settings, menus, pages, translations) sang JSON
- **Settings Export/Import**: Export và import lại site_settings, menus, pages dưới dạng JSON file
- **Content Export**: Export tools + reviews + blog posts sang JSON/CSV để backup
- **Import Restore**: Upload JSON file để restore settings, menus, pages
- Client-side download, không cần Edge Function mới

Tạo Edge Function `supabase/functions/backup-data/index.ts`:
- Endpoint admin-only đọc toàn bộ data qua service role
- Trả về JSON bundle chứa tất cả tables
- Hỗ trợ restore: nhận JSON bundle và upsert lại

### 2. Admin Analytics nâng cao (`/admin/analytics`)

Tạo `src/pages/admin/AdminAnalytics.tsx`:

- **Overview charts**: Biểu đồ tools mới theo ngày/tuần/tháng (Recharts)
- **User growth**: Chart đăng ký user theo thời gian
- **Content stats**: Reviews/comments/questions theo thời gian
- **Top categories**: Bar chart phân bố tools theo category
- **Traffic overview**: Page views từ tools (view_count), top viewed tools
- **Search analytics integration**: Link đến `/admin/search-analytics`
- **Export report**: Nút export analytics data sang CSV
- Date range picker (7 ngày / 30 ngày / 90 ngày / tất cả)

### 3. Pagination cho AdminReviews & AdminBlog

- Thêm pagination controls (page size 50, prev/next) giống AdminTools/AdminUsers
- Thêm nút Export CSV

### 4. Tích hợp useAuditLog vào admin actions

Gọi `logAuditAction()` khi:
- AdminTools: approve/reject/delete tool
- AdminUsers: change role, ban/unban user
- AdminReviews: change status, delete review
- AdminBlog: change status, delete post
- AdminReports: resolve/dismiss report
- AdminSettings: save settings

### 5. Sidebar + Routes cập nhật

- Thêm nav items: **Backup** (Database icon), **Analytics** (BarChart3 icon)
- Thêm routes: `/admin/backup`, `/admin/analytics`

---

### Tệp thay đổi

**Tạo mới (3 files):**
- `src/pages/admin/AdminBackup.tsx`
- `src/pages/admin/AdminAnalytics.tsx`
- `supabase/functions/backup-data/index.ts`

**Chỉnh sửa (8 files):**
- `src/App.tsx` (2 routes mới)
- `src/components/admin/AdminLayout.tsx` (2 nav items)
- `src/pages/admin/AdminReviews.tsx` (pagination + export CSV)
- `src/pages/admin/AdminBlog.tsx` (pagination + export CSV)
- `src/pages/admin/AdminTools.tsx` (audit log calls)
- `src/pages/admin/AdminUsers.tsx` (audit log calls)
- `src/pages/admin/AdminReports.tsx` (audit log calls)
- `src/pages/admin/AdminSettings.tsx` (audit log on save)
- `supabase/config.toml` (backup-data function config)

