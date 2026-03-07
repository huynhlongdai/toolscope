

## Đối chiếu danh mục CollectAI với danh mục hệ thống

### Vấn đề
Hiện tại khi AI trích xuất tools, `category_name` được lưu dưới dạng text tự do trong `collect_items`. Khi import, chỉ dùng `target_category_id` do admin chọn thủ công, không tự động đối chiếu với danh mục đã có.

### Giải pháp
Thêm logic **auto-match category** trong edge function `collect-ai` tại 2 điểm:

1. **Khi lưu collect_items (sau parse)**: Không thay đổi -- vẫn giữ `category_name` text từ AI.

2. **Khi import**: Trước khi insert tool, đối chiếu `category_name` của item với bảng `categories`:
   - Tìm category có `name` trùng (case-insensitive) hoặc `slug` khớp → dùng `category_id` đó
   - Nếu không tìm thấy → giữ nguyên `target_category_id` do admin chọn (hoặc null)
   - Lưu `category_name` gốc vào `collected_data` để admin biết AI gợi ý gì

3. **Trong UI staging (AdminCollectAI)**: Hiển thị badge cho biết category đã match hay chưa, cho phép admin override trước khi import.

### Kế hoạch thực hiện

#### 1. Cập nhật Edge Function `collect-ai/index.ts`
- Trong action `"import"`: trước khi insert tool, query bảng `categories` để match `item.category_name`
- Logic match: `ILIKE` trên `name`, hoặc slugify `category_name` rồi so với `slug`
- Nếu match → dùng category_id đó thay vì `target_category_id`
- Nếu không match → fallback về `target_category_id`

#### 2. Cập nhật UI `AdminCollectAI.tsx`
- Trong bảng staging items: hiển thị `category_name` với badge xanh "Đã match" nếu tìm thấy category trùng, badge vàng "Mới" nếu không
- Fetch categories list để so sánh client-side khi hiển thị
- Cho phép admin chọn category cho từng item trước import (dropdown override)

### Files chỉnh sửa
- `supabase/functions/collect-ai/index.ts` — thêm category matching logic trong action import
- `src/pages/admin/AdminCollectAI.tsx` — hiển thị match status và cho phép override category per item

