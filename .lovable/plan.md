

## Plan: Nâng cấp hệ thống đa ngôn ngữ toàn diện

### Phân tích hiện trạng

Hệ thống i18n hiện tại rất sơ khai:
- `I18nProvider` chỉ có hàm `t(vi, en)` yêu cầu truyền cả 2 chuỗi inline
- `useI18n` chỉ được dùng ở **Header** (nút chuyển ngôn ngữ) — không trang nào khác sử dụng
- Bảng `translations` đã có trong database nhưng frontend không query để hiển thị nội dung dịch
- Không có URL routing theo ngôn ngữ (`/en/tool/...`, `/vi/tool/...`)
- Toàn bộ UI labels, button text, placeholder đều hardcode tiếng Việt

### Kế hoạch triển khai (5 giai đoạn)

---

**Giai đoạn 1: Hệ thống dictionary cho UI labels**

Thay thế cách `t(vi, en)` hiện tại bằng dictionary key-based:
- Tạo file `src/lib/translations/vi.ts` và `src/lib/translations/en.ts` chứa tất cả UI strings (menu labels, button text, placeholder, error messages, section titles...)
- Cập nhật `I18nProvider` để load dictionary theo locale, hàm `t("nav.explore")` tra cứu key
- Ước tính ~200-300 keys cho toàn bộ UI

```text
vi.ts: { "nav.explore": "Khám phá", "nav.trending": "Xu hướng", "hero.title": "Khám phá công cụ tốt nhất", ... }
en.ts: { "nav.explore": "Explore", "nav.trending": "Trending", "hero.title": "Discover the best tools", ... }
```

**Giai đoạn 2: Áp dụng `t()` vào toàn bộ trang công khai**

Cập nhật lần lượt các components/pages để dùng `t()` thay vì hardcode:
- Header, Footer, MobileBottomNav
- HeroSection, CategoryGrid, FeaturedTools, StatsCounter
- ToolsPage, ToolDetail, ComparePage, BlogPage, DealsPage, LaunchesPage...
- Auth page (form đăng nhập/đăng ký)
- Các form: ReviewForm, CommentSection, QASection, SubmitToolPage

**Giai đoạn 3: Hiển thị nội dung dịch từ database**

Tận dụng bảng `translations` đã có:
- Tạo hook `useTranslatedContent(entityType, entityId, fields[])` — query bảng `translations` theo locale hiện tại
- Áp dụng vào ToolDetail: khi locale = "en", hiển thị name/description/detailed_content từ bảng translations thay vì dữ liệu gốc tiếng Việt
- Áp dụng cho BlogDetail, CategoryPage tương tự
- Fallback: nếu chưa có bản dịch → hiển thị nội dung gốc + badge "Chưa dịch"

**Giai đoạn 4: URL routing theo ngôn ngữ + SEO**

- Thêm route prefix: `/:locale/tool/:slug`, `/:locale/blog/:slug`...
- Tự động redirect `/tool/abc` → `/vi/tool/abc` hoặc `/en/tool/abc` theo locale
- Giữ backward compatibility: route cũ không prefix vẫn hoạt động (default = vi)
- Cập nhật SEOHead: thêm `<link rel="alternate" hreflang="en" href="...">` cho mỗi trang
- Cập nhật sitemap edge function: generate URL cho cả 2 ngôn ngữ
- Canonical URL trỏ đúng theo locale

**Giai đoạn 5: Admin — quản lý dịch nâng cao**

- Dashboard trạng thái dịch: % hoàn thành theo entity type (tools, blog, categories)
- Bulk translate: chọn nhiều tool/blog → dịch hàng loạt
- Auto-translate on publish: khi publish tool/blog mới → tự động trigger dịch
- Diff view: so sánh nội dung gốc vs bản dịch, highlight phần đã thay đổi cần dịch lại
- Export/Import translations CSV cho dịch thủ công bên ngoài

---

### Chi tiết kỹ thuật

**I18nProvider nâng cấp:**
```text
t("key") → tra dictionary
tc(entityType, entityId, field, fallback) → query translations table
locale trong URL → sync với context
```

**Hook useTranslatedContent:**
```text
Input: entityType="tool", entityId, fields=["name","description","detailed_content"]
Output: { name: "...", description: "...", isTranslated: true }
Cache: react-query với key ["translation", locale, entityType, entityId]
```

**Route structure:**
```text
/                    → redirect theo locale mặc định
/vi/tools            → danh sách tools tiếng Việt  
/en/tools            → danh sách tools tiếng Anh
/vi/tool/:slug       → chi tiết tool tiếng Việt
/en/tool/:slug       → chi tiết tool tiếng Anh
```

### Thứ tự ưu tiên triển khai

1. **Giai đoạn 1 + 2** (UI dictionary) — nền tảng, ảnh hưởng toàn app
2. **Giai đoạn 3** (dynamic content) — giá trị cao nhất cho người dùng EN
3. **Giai đoạn 4** (URL + SEO) — quan trọng cho SEO quốc tế
4. **Giai đoạn 5** (Admin tools) — tiện ích quản lý

