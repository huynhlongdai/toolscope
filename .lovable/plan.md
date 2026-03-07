

## Plan: Nâng cấp tính năng dịch — bao gồm dịch menu, blog, và hệ thống

### Hiện trạng & vấn đề

1. **Dịch menu**: Menu header/footer lấy từ bảng `menus` (cột `items` dạng JSON chứa `label`, `url`). Hiện tại label menu **không được dịch** — luôn hiển thị tiếng Việt bất kể locale.

2. **Dịch blog**: `UntranslatedSection` vẫn hiển thị "Chức năng dịch blog sẽ được hỗ trợ sớm" — chưa có edge function `translate-blog`.

3. **Dịch hệ thống**: `SystemTranslationsTab` chỉ hiển thị static `vi.ts` vs `en.ts`, nút Edit không lưu được (comment: "static files can't be edited at runtime"). Chưa hỗ trợ các ngôn ngữ khác ngoài EN. Chưa có bulk AI translate.

4. **I18nProvider**: Chưa load system translations từ DB để override dictionary.

---

### Thay đổi cụ thể

#### 1. Dịch menu — Lưu & hiển thị bản dịch menu items

- **Bảng `translations`**: Sử dụng `entity_type = "menu"`, `entity_id = menu.id`, `field_name = "item_0_label"`, `"item_1_label"`, ... để lưu bản dịch từng label.
- **Edge function mới `translate-menu`**: Nhận `menu_id` + `locale`, query menu items, gọi AI dịch tất cả labels, upsert vào `translations`.
- **Header.tsx / Footer.tsx**: Dùng `useTranslatedContent` (hoặc query trực tiếp) để lấy bản dịch menu labels theo locale hiện tại, override lên `item.label`.
- **Admin ContentTranslationsTab**: Thêm section "Menu chưa dịch" bên cạnh Tools và Blogs.

#### 2. Dịch blog — Edge function `translate-blog`

- **File mới**: `supabase/functions/translate-blog/index.ts`
- Tương tự `translate-tool`: nhận `blog_id` + `locale`, query `blog_posts` lấy `title`, `excerpt`, `content`, gọi AI dịch, upsert vào `translations` với `entity_type = "blog"`.
- **Cập nhật `UntranslatedSection`**: Thay text placeholder bằng nút dịch cho từng blog (giống tools).
- **Cập nhật `ContentTranslationsTab`**: Thêm mutation gọi `translate-blog`, bulk translate blogs.

#### 3. Nâng cấp dịch hệ thống

- **Lưu vào DB**: Khi admin edit/save system key → upsert vào `translations` với `entity_type = "system"`, `entity_id = UUID cố định`, `field_name = key`, `locale = target`.
- **Hỗ trợ multi-locale**: Thêm locale selector vào `SystemTranslationsTab` (không chỉ EN).
- **Bulk AI translate**: Edge function mới `translate-system-keys` nhận `{ keys: [{key, text}], locale }`, AI dịch batch, trả về kết quả. Admin review rồi save.
- **Fix nút Save**: Thay comment "can't edit at runtime" bằng logic upsert vào DB.

#### 4. I18nProvider load system translations từ DB

- **`src/lib/i18n.tsx`**: Khi locale khác `vi`, query `translations` WHERE `entity_type = "system"` AND `locale = current`, merge override lên dictionary.
- Ưu tiên: DB value > static file > key.
- Cache với `staleTime` dài (5 phút).

---

### Files thay đổi

| File | Hành động |
|------|-----------|
| `supabase/functions/translate-blog/index.ts` | Tạo mới |
| `supabase/functions/translate-menu/index.ts` | Tạo mới |
| `supabase/functions/translate-system-keys/index.ts` | Tạo mới |
| `supabase/config.toml` | Thêm 3 function entries |
| `src/components/admin/translations/ContentTranslationsTab.tsx` | Thêm blog translate + menu translate |
| `src/components/admin/translations/UntranslatedSection.tsx` | Thêm nút dịch blog + menu section |
| `src/components/admin/translations/SystemTranslationsTab.tsx` | Multi-locale, DB save, bulk AI translate |
| `src/lib/i18n.tsx` | Load system translations từ DB |
| `src/components/layout/Header.tsx` | Apply translated menu labels |
| `src/components/layout/Footer.tsx` | Apply translated menu labels |

### Thứ tự triển khai
1. Edge functions (translate-blog, translate-menu, translate-system-keys) + config.toml
2. SystemTranslationsTab nâng cấp (multi-locale, DB save, bulk AI)
3. UntranslatedSection + ContentTranslationsTab (blog + menu translate)
4. Header/Footer apply translated menu labels
5. I18nProvider load DB overrides

