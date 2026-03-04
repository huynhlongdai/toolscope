

## Plan tổng hợp: Nâng cấp toàn diện Admin CMS

Gộp tất cả các plan chưa triển khai (TipTap Editor, AdminTools chi tiết, AdminBlog editor, AdminUsers quản lý, Fake stats/reviews/Q&A, Menu Manager, Page Builder, ShareButtons, Dashboard biểu đồ) thành 1 lần triển khai.

---

### Hiện trạng

| Component | Thiếu |
|-----------|-------|
| AdminUsers | Chỉ có xem + đổi role. Không sửa/xóa user, không xem chi tiết |
| AdminTools | Form 7 field đơn giản. Thiếu category selector, tags, platforms, SEO, featured/trending, detailed_content editor, fake stats, fake reviews/Q&A, pricing plans, related tools, affiliate, share |
| AdminBlog | Chỉ danh sách + đổi status + xóa. Không có form tạo/sửa bài |
| AdminDashboard | 4 stat cards, không biểu đồ |
| Header/Footer | Menu hardcode |
| Rich text editor | Không có |
| Page Builder | Không có |
| ShareButtons | Không có |
| DB | Chưa có bảng menus, pages, page_templates |

---

### Triển khai (11 tasks)

#### 1. Cài TipTap + tạo RichTextEditor component
Cài: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, `@tiptap/extension-text-align`, `@tiptap/extension-underline`, `@tiptap/extension-youtube`, `@tiptap/extension-table` + row/cell/header, `@tiptap/extension-color`, `@tiptap/extension-text-style`

Tạo `src/components/admin/RichTextEditor.tsx` -- toolbar: Bold, Italic, Underline, Strikethrough, H1-H4, Lists, Alignment, Image URL, Link, YouTube, Table, Blockquote, Code block, Undo/Redo. Output HTML.

#### 2. Nâng cấp AdminUsers -- quản lý đầy đủ

Thêm vào `AdminUsers.tsx`:
- **Chỉnh sửa user**: Dialog sửa profile (display_name, username, bio, website, avatar_url, reputation_score)
- **Xóa user**: Xóa profile + user_roles (confirm dialog). Lưu ý: không xóa auth.users từ client -- chỉ xóa profile + roles
- **Xem chi tiết**: Expandable row hoặc dialog hiển thị bio, website, ngày tạo, số reviews/comments/questions
- **Ban/Suspend**: Thêm cột `is_banned boolean` vào profiles (migration). User bị ban không thể đăng nhập
- **Filter**: Lọc theo role (All/Admin/Editor/User)
- **Stats**: Hiển thị số reviews, comments, questions mỗi user
- **Bulk actions**: Checkbox chọn nhiều user để đổi role hoặc ban hàng loạt

#### 3. Nâng cấp AdminTools form -- 6 tabs chi tiết

Mở rộng `ToolFormDialog` thành large dialog:

**Tab Cơ bản**: Name, Slug, Short desc, Category dropdown (fetch DB), Platforms multi-select, Pricing type, Website URL, Logo URL, Affiliate URL, Featured/Trending toggles

**Tab Nội dung**: Description (RichTextEditor) + Detailed Content (RichTextEditor) -- admin chỉnh sửa trực tiếp trang giới thiệu tool

**Tab Fake Stats**: Set trực tiếp `avg_rating`, `rating_count`, `view_count` trên bảng tools

**Tab Reviews & Q&A ảo**:
- Danh sách reviews hiện có, nút tạo review ảo (`is_editor_review = true`)
- Danh sách questions, nút tạo Q&A ảo
- Toggle bật/tắt (đổi status) cho từng review

**Tab Pricing Plans**: Quản lý `pricing_details` (jsonb) -- thêm/sửa/xóa plan (tên, giá, currency, features). Thêm record `pricing_history`

**Tab Gợi ý & SEO**:
- Related tools: autocomplete search, lưu vào `related_tool_ids uuid[]` (cần migration)
- SEO: meta title, meta description, slug preview
- Share preview links (Facebook/Twitter/LinkedIn)

#### 4. Nâng cấp AdminBlog -- full Blog CMS
- Nút "Tạo bài viết" + nút "Sửa" mỗi bài
- Form: Title, Slug auto-gen, Excerpt, Cover image URL, Tags, Content (RichTextEditor), Status, nút Publish
- Search + filter

#### 5. ShareButtons component
Tạo `src/components/share/ShareButtons.tsx`: Facebook, Twitter/X, LinkedIn, Copy link.
Tích hợp vào BlogDetail + ToolDetail.

#### 6. AdminDashboard biểu đồ
Recharts: "Tools mới theo tuần" (BarChart) + "Top 5 tools xem nhiều".

#### 7. Database migration

```sql
-- Thêm cột vào tools
ALTER TABLE tools ADD COLUMN IF NOT EXISTS related_tool_ids uuid[] DEFAULT '{}';

-- Thêm cột ban user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;

-- Bảng menus
CREATE TABLE menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL, -- 'header', 'footer'
  items jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
-- Public read, admin write

-- Bảng pages
CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  blocks jsonb NOT NULL DEFAULT '[]',
  seo_title text,
  seo_description text,
  status content_status DEFAULT 'draft',
  template text DEFAULT 'blank',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Bảng page_templates
CREATE TABLE page_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  thumbnail_url text,
  blocks jsonb NOT NULL DEFAULT '[]',
  category text
);
ALTER TABLE page_templates ENABLE ROW LEVEL SECURITY;
```

RLS: Admin-only write, public SELECT cho menus + published pages + templates.

#### 8. Menu Manager (`/admin/menus`)
- Chọn location (Header/Footer)
- Nested list editor: label, URL, children, open_new_tab
- Thêm item từ pages hoặc custom URL

#### 9. Dynamic Header & Footer
- `Header.tsx`: Fetch menu từ DB `location='header'`, fallback hardcode hiện tại
- `Footer.tsx`: Tương tự `location='footer'`
- Cache React Query staleTime dài

#### 10. Page Builder (`/admin/pages`)
- Danh sách trang + CRUD
- Page Editor 2 cột: Block Palette (trái) + Canvas (phải)
- Block types: Hero, Text (RichTextEditor), Image, CTA, Features Grid, FAQ, Video, Divider, Tool Cards, Blog Posts
- `BlockRenderer.tsx` + `blocks/*.tsx`
- Seed 3 templates: Landing, About, Blank

#### 11. Dynamic Page Route
- Route `/p/:slug` trong App.tsx
- `DynamicPage.tsx`: fetch page, render blocks
- SEO: set document.title

---

### Cập nhật content rendering
- `BlogDetail.tsx`: Render HTML (`dangerouslySetInnerHTML` + `prose`) khi content là HTML, fallback ReactMarkdown
- `ToolDetail.tsx`: Tương tự cho description + detailed_content. Hiển thị pricing_details thành bảng giá. Related tools ưu tiên `related_tool_ids`, fallback category. ShareButtons thay nút copy link

---

### Files tổng hợp

| File | Action |
|------|--------|
| DB Migration | 3 bảng mới + 2 cột mới |
| `src/components/admin/RichTextEditor.tsx` | Tạo mới |
| `src/components/share/ShareButtons.tsx` | Tạo mới |
| `src/pages/admin/AdminUsers.tsx` | Nâng cấp lớn -- sửa/xóa/ban/filter/stats |
| `src/pages/admin/AdminTools.tsx` | Rewrite -- 6 tabs |
| `src/pages/admin/AdminBlog.tsx` | Thêm full CRUD editor |
| `src/pages/admin/AdminDashboard.tsx` | Thêm biểu đồ |
| `src/pages/admin/AdminMenus.tsx` | Tạo mới |
| `src/pages/admin/AdminPages.tsx` | Tạo mới |
| `src/pages/admin/AdminPageEditor.tsx` | Tạo mới |
| `src/components/page-builder/BlockRenderer.tsx` | Tạo mới |
| `src/components/page-builder/BlockPalette.tsx` | Tạo mới |
| `src/components/page-builder/BlockEditor.tsx` | Tạo mới |
| `src/components/page-builder/blocks/*.tsx` | ~10 block components |
| `src/pages/DynamicPage.tsx` | Tạo mới |
| `src/pages/BlogDetail.tsx` | HTML rendering + ShareButtons |
| `src/pages/ToolDetail.tsx` | Pricing table + related tools + ShareButtons |
| `src/components/layout/Header.tsx` | Fetch menu từ DB |
| `src/components/layout/Footer.tsx` | Fetch menu từ DB |
| `src/components/admin/AdminLayout.tsx` | Thêm nav: Menus, Pages |
| `src/App.tsx` | Thêm routes |

Do khối lượng rất lớn (~20+ files), sẽ chia thành 2-3 lần triển khai tuần tự.

