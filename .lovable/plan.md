

## Rà soát & Nâng cấp Module Tools trong Admin

### Vấn đề hiện tại

1. **Bộ lọc ngôn ngữ thiếu**: Filter "Dịch thuật" chỉ có "Đã dịch / Chưa dịch" chung chung, không lọc theo từng locale cụ thể (en, zh, ja, ko...). Logic filter theo locale cụ thể ở dòng 107-109 có code nhưng **không thực sự filter** (comment trống).

2. **Tab Dịch tách rời**: Tab "Dịch" nằm cuối cùng trong 8 tabs, khó tiếp cận. Cần tích hợp trạng thái dịch trực quan hơn ngay trong danh sách tools.

3. **Batch translate chỉ dịch sang tiếng Anh**: `BatchTranslateButton` hardcode `locale: "en"`, không cho chọn ngôn ngữ đích.

4. **TranslateButton inline cũng hardcode `locale: "en"`**.

### Kế hoạch thực hiện

#### 1. Nâng cấp bộ lọc ngôn ngữ (Filter bar)
- Thay dropdown "Dịch thuật" hiện tại bằng dropdown có đầy đủ 10 locale từ `SUPPORTED_LOCALES` (trừ `vi`)
- Các option: `Tất cả` | `Chưa dịch (bất kỳ)` | `🇺🇸 English` | `🇨🇳 中文` | `🇯🇵 日本語` | ...
- Khi chọn locale cụ thể (VD: `en`), query `translations` table lọc theo `locale = 'en'` và hiển thị tool **chưa có** bản dịch cho locale đó
- Fix logic filter dòng 107-109 để thực sự hoạt động

#### 2. Hiển thị trạng thái dịch trong bảng danh sách
- Thêm cột "Ngôn ngữ" vào bảng tools, hiển thị các flag icon cho locale đã có bản dịch
- Query batch translation status: `SELECT DISTINCT entity_id, locale FROM translations WHERE entity_type = 'tool'`
- Hiển thị dạng: 🇺🇸🇨🇳🇯🇵 (các flag đã dịch) hoặc badge số lượng "3/10"

#### 3. Nâng cấp Batch Translate
- `BatchTranslateButton`: Thêm dropdown chọn locale đích thay vì hardcode `en`
- `TranslateButton` inline: Thêm popover chọn locale hoặc dịch tất cả locale cùng lúc

#### 4. Tích hợp quản lý dịch trực tiếp vào form chỉnh sửa tool
- Tab "Dịch" đã có `EntityTranslationEditor` — giữ nguyên nhưng cải thiện:
  - Thêm badge hiển thị số locale đã dịch trên tab trigger: `Dịch (3/10)`
  - Thêm nút "Dịch tất cả ngôn ngữ" trong tab để dịch tool sang tất cả locale cùng lúc

### Technical Details

**File chỉnh sửa**: `src/pages/admin/AdminTools.tsx`

- Import `SUPPORTED_LOCALES` từ `@/lib/i18n`
- Query translation status: thêm query lấy `Map<toolId, Set<locale>>` từ bảng `translations`
- Filter logic: khi `translationFilter` là locale cụ thể (VD `en`), check tool có/không có trong set tương ứng
- `BatchTranslateButton`: nhận thêm prop `locale` từ state, hiển thị `Select` chọn ngôn ngữ
- Cột mới trong table: render flags từ translation status map
- Tab "Dịch" trigger: query count translations cho tool hiện tại

