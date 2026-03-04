

## Plan: Thêm FAQ tự động khi AI tạo bài giới thiệu tool

### Vấn đề
Hiện tại edge function `generate-tool-article` và `collect-tool-data` tạo bài giới thiệu tool nhưng không có phần FAQ. FAQ (Frequently Asked Questions) là yếu tố quan trọng giúp tăng điểm SEO nhờ FAQ Schema (JSON-LD) mà Google hiển thị trực tiếp trên kết quả tìm kiếm.

### Giải pháp

**1. Database: Thêm cột `faq` vào bảng `tools`**
- Kiểu `jsonb`, nullable, lưu mảng `[{question, answer}, ...]`

**2. Edge function `generate-tool-article/index.ts`**
- Thêm section `## Câu hỏi thường gặp (FAQ)` vào prompt
- Yêu cầu AI tạo 5-8 câu hỏi FAQ phổ biến về tool
- Sau khi nhận response, parse FAQ từ markdown và lưu riêng vào cột `faq` dưới dạng JSON array
- Cập nhật DB: save cả `detailed_content` lẫn `faq`

**3. Edge function `collect-tool-data/index.ts`**
- Thêm field `faq` vào AI prompt output JSON
- Yêu cầu AI trả về mảng `[{question, answer}]` khi thu thập dữ liệu tool
- Khi `save_to_db`, lưu luôn `faq` vào bảng tools

**4. UI Admin (`AdminTools.tsx`)**
- Thêm tab hoặc section "FAQ" trong ToolFormDialog
- Hiển thị danh sách FAQ đã được AI tạo
- Cho phép admin thêm/sửa/xóa từng câu hỏi-trả lời

**5. Frontend hiển thị (`ToolDetail.tsx`)**
- Render FAQ dưới dạng Accordion ở cuối trang chi tiết tool
- Thêm FAQ Schema (JSON-LD) vào `<head>` để Google nhận diện rich snippet

### Files thay đổi

| File | Thay đổi |
|------|----------|
| DB migration | Thêm cột `faq jsonb` vào `tools` |
| `supabase/functions/generate-tool-article/index.ts` | Thêm FAQ vào prompt + parse + save |
| `supabase/functions/collect-tool-data/index.ts` | Thêm `faq` vào AI prompt JSON output |
| `src/pages/admin/AdminTools.tsx` | UI quản lý FAQ trong form |
| `src/pages/ToolDetail.tsx` | Render FAQ Accordion + JSON-LD Schema |

