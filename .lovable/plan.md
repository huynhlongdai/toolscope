

## Plan: Bổ sung đa ngôn ngữ phổ biến

### Hiện trạng
- Chỉ hỗ trợ 2 ngôn ngữ: `vi` (mặc định) và `en`
- Language switcher là toggle đơn giản VI/EN
- `translate-tool` edge function hardcode prompt "Vietnamese to English"
- `useTranslatedContent` skip query khi `locale === "vi"`
- Bảng `translations` đã có cột `locale` — sẵn sàng cho multi-locale

### Ngôn ngữ bổ sung
Dựa trên target khách hàng website review AI tools, thêm các ngôn ngữ phổ biến:

| Code | Ngôn ngữ | Lý do |
|------|----------|-------|
| `en` | English | Đã có |
| `zh` | 中文 (Chinese) | Thị trường AI lớn nhất châu Á |
| `ja` | 日本語 (Japanese) | Thị trường tech cao cấp |
| `ko` | 한국어 (Korean) | Adoption AI tools cao |
| `th` | ภาษาไทย (Thai) | Đông Nam Á, gần VN |
| `id` | Bahasa Indonesia | Thị trường lớn nhất ĐNA |
| `es` | Español (Spanish) | ~500M người dùng |
| `fr` | Français (French) | Thị trường EU + châu Phi |
| `pt` | Português (Portuguese) | Brazil — thị trường tech lớn |
| `de` | Deutsch (German) | EU tech hub |

### Thay đổi cụ thể

#### 1. Cập nhật `src/lib/i18n.tsx`
- Mở rộng type `Locale` thành union 11 ngôn ngữ
- Các ngôn ngữ mới **không cần file dictionary tĩnh** — sẽ fallback sang `vi` cho UI strings
- Thêm metadata object `SUPPORTED_LOCALES` với label, flag emoji cho mỗi ngôn ngữ (dùng chung ở Header + Admin)

#### 2. Cập nhật Language Switcher trong `Header.tsx`
- Thay toggle VI/EN bằng **Dropdown menu** hiển thị tất cả ngôn ngữ với flag + tên
- Cả desktop và mobile menu đều dùng dropdown mới

#### 3. Cập nhật `translate-tool` edge function
- Thay prompt hardcode "Vietnamese to English" thành dynamic dựa trên `locale` param
- Thêm mapping locale → language name cho prompt AI

#### 4. Cập nhật `useTranslatedContent` hook
- Thay `locale !== "vi"` thành check dynamic — chỉ skip query khi locale là ngôn ngữ gốc (`vi`)
- Logic hiện tại đã đúng, chỉ cần đảm bảo type mới được accept

#### 5. Cập nhật `AdminTranslations.tsx`
- Thêm locale selector (dropdown chọn ngôn ngữ đích) thay vì hardcode `en`
- Truyền locale được chọn vào mutation `translate-tool` 
- Stats và filters theo locale đã chọn

#### 6. Cập nhật `UntranslatedSection`
- Nhận prop `targetLocale` để biết đang dịch sang ngôn ngữ nào
- Truyền locale vào edge function call

### File thay đổi
1. `src/lib/i18n.tsx` — mở rộng Locale type + SUPPORTED_LOCALES config
2. `src/components/layout/Header.tsx` — dropdown language switcher
3. `supabase/functions/translate-tool/index.ts` — dynamic locale prompt
4. `src/hooks/useTranslatedContent.ts` — type update
5. `src/pages/admin/AdminTranslations.tsx` — locale selector
6. `src/components/admin/translations/UntranslatedSection.tsx` — nhận targetLocale prop

