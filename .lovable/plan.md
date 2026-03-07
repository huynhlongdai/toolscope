

## Nâng cấp i18n: Dịch toàn bộ trang còn hardcode + hỗ trợ 11 ngôn ngữ

### Vấn đề
Nhiều trang public hardcode tiếng Việt (TasksPage, CategoriesPage, ComparePage, LeaderboardPage, BookmarksPage, CollectionsPage, LaunchesPage). Khi đổi sang bất kỳ ngôn ngữ nào trong 11 locale (vi, en, zh, ja, ko, th, id, es, fr, pt, de), nội dung vẫn hiện tiếng Việt.

Ngoài ra, dữ liệu động từ DB (tên task, tên category) cũng chưa được dịch theo locale.

### Kế hoạch thực hiện

#### 1. Thêm ~45 translation keys vào `vi.ts` và `en.ts`
Nhóm keys mới cho các trang: `tasks.*`, `categories.page.*`, `launches.*`, `leaderboard.*`, `compare.*`, `bookmarks.*`, `collections.page.*`

Với 9 ngôn ngữ còn lại (zh, ja, ko, th, id, es, fr, pt, de): hệ thống đã có cơ chế DB override (`system` translations) + fallback về `en` → `vi`. Admin có thể dịch batch qua Admin Translations (System tab) cho tất cả keys mới.

#### 2. Tạo `useTranslatedList` hook
Hook mới trong `src/hooks/useTranslatedContent.ts` để batch-translate danh sách entities trong 1 query duy nhất (tránh N+1):
- Nhận `entityType`, `entityIds[]`, `fields[]`
- Query `translations` table với `.in("entity_id", ids)` + `.eq("locale", locale)`
- Trả về `Map<entityId, {field: translatedText}>`

#### 3. Cập nhật 7 trang thay hardcode → `t()`
- **TasksPage.tsx**: title, subtitle, back button, tool count, empty state, SEO → dùng `t()` + `useTranslatedList` cho task names/descriptions
- **CategoriesPage.tsx**: page title, subtitle, tool count label, SEO → `useTranslatedList` cho category names
- **ComparePage.tsx**: ~10 chuỗi (title, subtitle, pricing labels, chart labels, tab names) → `t()`. Pricing labels dùng `t("pricing.*")` keys đã có
- **LeaderboardPage.tsx**: title, tab labels, empty state, ranking labels → `t()`
- **LaunchesPage.tsx**: empty state, SEO description → `t()`
- **BookmarksPage.tsx**: title, empty state → `t()`
- **CollectionsPage.tsx**: title, subtitle → `t()`

#### 4. SEO metadata theo locale
Các `<SEOHead>` trong mỗi trang sẽ dùng `t()` cho title/description, tự động theo locale hiện tại.

### Files chỉnh sửa
- `src/lib/translations/vi.ts` — thêm ~45 keys
- `src/lib/translations/en.ts` — thêm ~45 keys (đã có sẵn một số)
- `src/hooks/useTranslatedContent.ts` — thêm export `useTranslatedList`
- `src/pages/TasksPage.tsx` — thay hardcode + dịch dynamic data
- `src/pages/CategoriesPage.tsx` — thay hardcode + dịch dynamic data
- `src/pages/ComparePage.tsx` — thay hardcode
- `src/pages/LeaderboardPage.tsx` — thay hardcode
- `src/pages/LaunchesPage.tsx` — thay hardcode
- `src/pages/BookmarksPage.tsx` — thay hardcode
- `src/pages/CollectionsPage.tsx` — thay hardcode

### Hỗ trợ đa ngôn ngữ
- **vi + en**: static dictionary files có sẵn tất cả keys
- **9 ngôn ngữ khác** (zh, ja, ko, th, id, es, fr, pt, de): sử dụng cơ chế DB override hiện có — Admin vào **Admin Translations → System tab** để dịch batch tất cả keys mới sang các ngôn ngữ cần thiết. Fallback chain: DB override → en → vi → key name

