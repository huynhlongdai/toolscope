

## Plan: Thu thập hàng loạt 500 tool tự động

### Phân tích
Hệ thống collect-ai hiện tại thu thập ~20-30 tool mỗi lần tìm kiếm. Để đạt 500 tool, cần tạo một edge function mới chạy tự động qua ~25 từ khóa đa dạng.

### Tạo edge function `bulk-collect-tools`

**Logic:**
1. Định nghĩa sẵn ~25 từ khóa phổ biến đa lĩnh vực:
   - "project management", "design tool", "video editing", "AI writing", "CRM software", "email marketing", "SEO tool", "accounting software", "social media management", "cloud storage", "password manager", "note taking app", "code editor", "website builder", "photo editing", "database tool", "analytics platform", "communication tool", "HR software", "e-commerce platform", "automation tool", "presentation software", "scheduling app", "file sharing", "cybersecurity tool"

2. Với mỗi từ khóa, gọi AI (Gemini Flash) để sinh danh sách 20 tool thực tế (tên, URL, mô tả tiếng Việt, pricing_type, category)

3. Deduplicate theo tên (lowercase) trước khi lưu

4. Lưu vào `collect_items` với status `pending`, tạo session cho mỗi batch

5. Trả về tổng số tool đã thu thập

**Tại sao dùng AI thay vì Firecrawl:**
- Firecrawl tốn credit nhiều (25 lần search = 25 credits)
- AI có thể sinh 20 tool/lần với thông tin chính xác, nhanh hơn
- Không cần scrape từng trang

### Gọi function từ Admin
- Thêm nút "Thu thập 500 tool" trong trang AdminCollectAI hoặc AdminTools
- Hiển thị progress và kết quả

### File thay đổi
1. **Tạo mới**: `supabase/functions/bulk-collect-tools/index.ts`
2. **Sửa**: `src/pages/admin/AdminCollectAI.tsx` — thêm nút trigger bulk collect

### Cấu trúc dữ liệu output
Mỗi tool được lưu vào `collect_items`:
- `name`, `website_url`, `description` (tiếng Việt), `pricing_type`, `category_name`
- `status: "pending"` — chờ admin duyệt
- `collected_data`: chứa metadata gốc

