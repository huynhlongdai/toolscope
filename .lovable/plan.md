

## Plan: Thêm thông tin Trial & Đăng ký vào Tools

### Vấn đề
- Cột `has_free_trial` đã tồn tại nhưng chỉ là boolean đơn giản, không chứa chi tiết (bao nhiêu ngày, có cần thẻ không, loại đăng ký)
- Dữ liệu hiện tại toàn bộ `has_free_trial = false` vì AI collect không trích xuất thông tin này
- Không có bộ lọc trial trong Admin Tools

### Thay đổi

**1. Migration: Thêm các cột mới vào bảng `tools`**
```sql
ALTER TABLE tools ADD COLUMN trial_days integer DEFAULT NULL;
ALTER TABLE tools ADD COLUMN requires_card boolean DEFAULT NULL;
ALTER TABLE tools ADD COLUMN signup_options text[] DEFAULT '{}';
-- signup_options: ['free_signup', 'google_sso', 'github_sso', 'email_only', 'demo_request']
```

**2. Cập nhật Edge Function `collect-tool-data`**
- Thêm các trường vào prompt AI: `has_free_trial`, `trial_days`, `requires_card`, `signup_options`
- AI sẽ phân tích trang pricing/signup để trích xuất thông tin này
- Lưu các trường mới khi save_to_db

**3. Edge Function mới: `enrich-trial-info`**
- Nhận `tool_id` hoặc batch tool IDs
- Scrape trang pricing của tool (dùng Firecrawl)
- AI phân tích và trả về: has_free_trial, trial_days, requires_card, signup_options
- Cập nhật trực tiếp vào DB
- Hỗ trợ chạy batch cho tất cả tools chưa có thông tin trial

**4. Admin Tools (`AdminTools.tsx`)**
- Thêm bộ lọc: "Trial" dropdown (Tất cả / Có trial / Không cần thẻ / Đăng ký miễn phí)
- Hiển thị badges trial info trên mỗi tool card (VD: "14 ngày trial", "No card", "Free signup")
- Nút "Quét thông tin Trial" (bulk) để chạy enrich cho tất cả tools

**5. Category Page (`CategoryPage.tsx`)**
- Mở rộng filter "Có dùng thử" thành dropdown chi tiết hơn:
  - Có trial miễn phí
  - Không cần thẻ tín dụng
  - Đăng ký miễn phí (free signup)

**6. ToolCard (`ToolCard.tsx`)**
- Hiển thị badge nhỏ "Free Trial" / "No Card" trên card khi có thông tin

### File thay đổi
1. **Migration**: Thêm 3 cột mới vào `tools`
2. **Sửa**: `supabase/functions/collect-tool-data/index.ts` — thêm trường trial vào prompt
3. **Tạo**: `supabase/functions/enrich-trial-info/index.ts` — function quét trial info
4. **Sửa**: `src/pages/admin/AdminTools.tsx` — bộ lọc trial + nút quét batch
5. **Sửa**: `src/pages/CategoryPage.tsx` — filter trial chi tiết
6. **Sửa**: `src/components/tools/ToolCard.tsx` — badges trial

