

## Plan tổng hợp: Bổ sung toàn bộ module còn thiếu cho ToolScope

### Tình trạng hiện tại
- 20+ trang public, 17 trang admin, 12 edge functions
- DB đầy đủ (30+ bảng) nhưng nhiều bảng chưa có UI quản lý
- Profile chỉ hiển thị, Auth thiếu forgot password, admin thiếu Reports/AuditLogs/Newsletter/Translations

---

### PHASE 1: Admin modules hoàn toàn thiếu

**1.1 Admin Reports** (`/admin/reports`)
- Tạo `src/pages/admin/AdminReports.tsx`
- Danh sách từ bảng `reports`: filter status (pending/resolved/dismissed), actions resolve/dismiss
- Thêm nút "Báo cáo" trên CommentSection và ReviewBreakdown

**1.2 Admin Audit Logs** (`/admin/audit-logs`)
- Tạo `src/pages/admin/AdminAuditLogs.tsx`
- Timeline view từ bảng `audit_logs`, filter theo action/entity_type/date
- Tạo hook `src/hooks/useAuditLog.ts` để ghi log khi admin thao tác (approve/reject/delete)

**1.3 Admin Newsletter** (`/admin/newsletter`)
- Tạo `src/pages/admin/AdminNewsletter.tsx`
- Danh sách subscribers, search, toggle active/inactive, export CSV, stats chart

**1.4 Admin Translations** (`/admin/translations`)
- Tạo `src/pages/admin/AdminTranslations.tsx`
- Hiển thị trạng thái dịch mỗi tool/blog, trigger dịch lại, chỉnh sửa bản dịch thủ công

**1.5 Cập nhật AdminLayout sidebar**
- Thêm 4 nav items: Reports, Audit Logs, Newsletter, Translations
- Thêm routes trong App.tsx

---

### PHASE 2: Admin Settings mở rộng + AI Provider Keys

**2.1 AI Provider Keys section trong AdminSettings**
- Input fields (type password + toggle) cho: OpenAI, Google Gemini, CometAPI, Perplexity, Firecrawl
- Nút "Test Connection" cho mỗi provider
- Badge trạng thái: Đã cấu hình / Chưa

**2.2 AI Provider Selection**
- Dropdown chọn provider mặc định cho từng tính năng: AI Chat, AI Search, Content Generation
- Lưu vào `site_settings` key `ai_provider_config`

**2.3 Edge function `manage-ai-keys`**
- Tạo `supabase/functions/manage-ai-keys/index.ts`
- CRUD keys trong `site_settings` (masked khi đọc, full khi edge function cần)
- Test connection endpoint cho từng provider

**2.4 Cập nhật edge functions hiện tại**
- Sửa ai-chat, ai-search, generate-blog-post, generate-review, generate-tool-article, generate-workflow, translate-tool, collect-ai
- Đọc `ai_provider_config` từ `site_settings`, route tới provider phù hợp
- Fallback về Lovable Gateway nếu external key lỗi

**2.5 Site Settings mở rộng**
- Site name, site description, site logo URL
- Default language (vi/en)
- Social links (Facebook, Twitter, YouTube)
- Contact email, Footer copyright text
- Maintenance mode toggle

---

### PHASE 3: Public UX còn thiếu

**3.1 Submit Tool Page** (`/submit`)
- Tạo `src/pages/SubmitToolPage.tsx`
- Form: name, URL, description, category
- Insert tools với status `pending_review`, submitted_by = auth.uid()

**3.2 Edit Profile**
- Sửa `src/pages/ProfilePage.tsx`: thêm form edit (display_name, username, bio, website, avatar upload)
- Tab "Hoạt động": hiển thị recent comments, bookmarks thay vì "Sắp ra mắt"

**3.3 Forgot Password**
- Sửa `src/pages/Auth.tsx`: thêm link "Quên mật khẩu?" + form nhập email
- Gọi `supabase.auth.resetPasswordForEmail()`

**3.4 Google OAuth** (optional - cần cấu hình provider)
- Thêm nút "Đăng nhập bằng Google" trên Auth page

---

### PHASE 4: Enhanced Dashboard + Pagination

**4.1 Enhanced Admin Dashboard**
- Thêm stats: pending reports, active deals, newsletter subscribers, reviews today
- Quick action links đến moderation queue, pending tools, reports
- Recent activity feed (latest reviews, signups, tool submissions)

**4.2 Pagination cho Admin Tables**
- AdminTools, AdminUsers, AdminReviews, AdminBlog: thêm pagination controls
- Page size selector (25/50/100), range-based Supabase query

**4.3 Pagination cho ToolsPage**
- Thay limit cứng bằng infinite scroll hoặc numbered pagination

**4.4 Export CSV**
- Nút Export trên AdminTools, AdminUsers, AdminNewsletter
- Client-side CSV generation

---

### Tệp thay đổi tổng hợp

**Tạo mới (7 files):**
- `src/pages/SubmitToolPage.tsx`
- `src/pages/admin/AdminReports.tsx`
- `src/pages/admin/AdminAuditLogs.tsx`
- `src/pages/admin/AdminNewsletter.tsx`
- `src/pages/admin/AdminTranslations.tsx`
- `src/hooks/useAuditLog.ts`
- `supabase/functions/manage-ai-keys/index.ts`

**Chỉnh sửa (12+ files):**
- `src/App.tsx` (6 routes mới)
- `src/components/admin/AdminLayout.tsx` (4 sidebar items mới)
- `src/pages/admin/AdminSettings.tsx` (AI keys + site info + social links)
- `src/pages/admin/AdminDashboard.tsx` (enhanced stats + quick actions)
- `src/pages/ProfilePage.tsx` (edit form + activity tab)
- `src/pages/Auth.tsx` (forgot password + Google OAuth)
- `src/pages/ToolsPage.tsx` (pagination)
- `src/pages/admin/AdminTools.tsx` (pagination + export CSV)
- `src/pages/admin/AdminUsers.tsx` (pagination)
- `src/components/tool-detail/CommentSection.tsx` (nút report)
- `src/components/tool-detail/ReviewBreakdown.tsx` (nút report)
- `supabase/functions/ai-chat/index.ts` (multi-provider)
- `supabase/functions/ai-search/index.ts` (multi-provider)
- `supabase/functions/generate-blog-post/index.ts` (multi-provider)
- `supabase/functions/generate-review/index.ts` (multi-provider)
- `supabase/functions/generate-tool-article/index.ts` (multi-provider)
- `supabase/functions/generate-workflow/index.ts` (multi-provider)
- `supabase/functions/translate-tool/index.ts` (multi-provider)
- `supabase/functions/collect-ai/index.ts` (multi-provider)

**Plan file:** Cập nhật `.lovable/plan.md` gộp tất cả thành 1 plan thống nhất

---

### Thứ tự triển khai đề xuất
1. Phase 1 → Admin Reports, Audit Logs, Newsletter, Translations (nền tảng quản trị)
2. Phase 2 → AI Provider Keys + Settings mở rộng (linh hoạt AI backend)
3. Phase 3 → Submit Tool, Edit Profile, Forgot Password (UX người dùng)
4. Phase 4 → Dashboard nâng cao, Pagination, Export CSV (hiệu suất)

