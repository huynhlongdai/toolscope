

## Plan: Auto-fill tool form bằng AI khi nhập tên hoặc URL

### Vấn đề
Khi thêm tool mới, admin phải nhập tay tất cả thông tin. Edge function `collect-tool-data` đã tồn tại và hoạt động tốt (scrape URL → AI phân tích → trả về structured data), nhưng chưa được tích hợp vào form thêm tool.

### Giải pháp
Thêm nút "Auto-fill" vào tab Cơ bản của `ToolFormDialog`. Admin nhập tên hoặc website URL → gọi `collect-tool-data` → tự động điền toàn bộ form fields.

### Thay đổi

**`src/pages/admin/AdminTools.tsx`** - ToolFormDialog:

1. Thêm state `autoFilling` (loading) vào ToolFormDialog

2. Thêm hàm `handleAutoFill`:
   - Nếu `form.website_url` có giá trị → gọi `collect-tool-data` với URL đó
   - Nếu chỉ có `form.name` → gọi `collect-tool-data` với URL `https://www.google.com/search?q={name}+tool` hoặc dùng tên làm query. Thực tế tốt hơn: tạo thêm logic trong edge function để hỗ trợ search by name.
   - Khi nhận kết quả → map vào form state: name, slug, short_description, description, detailed_content, pricing_type, platforms, logo_url, website_url, pricing_details, features
   - Auto-convert description/detailed_content từ Markdown sang HTML (dùng `marked.parse`)
   - Match `category_suggestion` với categories hiện có để tự động chọn category_id

3. UI: Thêm vào đầu tab "Cơ bản" một Card chứa:
   - Input URL hoặc tên tool
   - Nút "Thu thập tự động" với icon Wand/Sparkles + loading spinner
   - Hint text giải thích chức năng

**`supabase/functions/collect-tool-data/index.ts`**:

4. Mở rộng để hỗ trợ parameter `name` (ngoài `url`):
   - Nếu nhận `name` thay vì `url` → dùng Firecrawl search API để tìm website chính thức của tool → sau đó scrape website đó
   - Fallback: nếu không tìm được URL, dùng AI để generate thông tin cơ bản từ tên tool dựa trên kiến thức của model

5. Thêm `detailed_content` vào AI prompt output:
   - Yêu cầu AI tạo bài giới thiệu chi tiết (HTML format) gồm: Tổng quan, Tính năng chính, Giá cả, Đối tượng sử dụng, Ưu/Nhược điểm
   - Giúp admin có sẵn nội dung để chỉnh sửa trong TipTap editor

### Luồng sử dụng

```text
Admin mở "Thêm Tool mới"
  ↓
Nhập tên "Figma" hoặc URL "https://figma.com"
  ↓
Bấm "Thu thập tự động" 
  ↓
[Edge function: search name → find URL → scrape → AI analyze]
  ↓
Form tự động điền: name, slug, description, pricing, platforms, logo, ...
  ↓
Admin review + chỉnh sửa nếu cần → Lưu
```

### Files thay đổi
| File | Action |
|------|--------|
| `src/pages/admin/AdminTools.tsx` | Thêm auto-fill UI + logic |
| `supabase/functions/collect-tool-data/index.ts` | Hỗ trợ search by name + thêm detailed_content |

