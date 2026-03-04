

## Ý tưởng chức năng AI hỗ trợ Blog & SEO

### 1. Viết bài blog tự động bằng AI
- Admin nhập **chủ đề/keyword** (VD: "Top 10 AI Design Tools 2026") → AI tạo bài hoàn chỉnh: tiêu đề, excerpt, nội dung HTML, tags
- Hỗ trợ chọn **kiểu bài**: listicle, so sánh, hướng dẫn, review, tin tức
- Tự động liên kết `related_tool_ids` với các tool có trong DB
- Edge function `generate-blog-post` gọi Lovable AI, trả HTML cho TipTap editor

### 2. SEO Optimizer cho mỗi bài viết
- Thêm fields SEO vào `blog_posts`: `seo_title`, `seo_description`, `seo_keywords`, `canonical_url`
- Nút **"Phân tích SEO"**: AI đánh giá bài viết theo tiêu chí:
  - Độ dài title/description, mật độ keyword, cấu trúc heading (H2/H3), internal links, readability
  - Trả về điểm SEO (0-100) + danh sách gợi ý cải thiện cụ thể
- Nút **"Tạo SEO tự động"**: AI sinh seo_title, seo_description, tags tối ưu từ nội dung bài

### 3. AI viết lại / cải thiện nội dung (Rewrite)
- Chọn đoạn text trong editor → menu ngữ cảnh AI:
  - **Viết lại ngắn gọn hơn**
  - **Mở rộng chi tiết hơn**
  - **Đổi tone** (chuyên nghiệp / thân thiện / kỹ thuật)
  - **Sửa lỗi chính tả & ngữ pháp**
- Hiển thị preview trước khi apply

### 4. Tạo dàn ý (Outline) từ keyword
- Nhập keyword → AI tạo dàn ý bài viết với các heading H2/H3
- Admin chỉnh sửa dàn ý → bấm "Viết từ dàn ý" → AI triển khai từng section

### 5. Tự động tạo excerpt & meta description
- Khi lưu bài mà `excerpt` trống → AI tự động tóm tắt 2-3 câu từ nội dung
- Tương tự cho `seo_description` (tối đa 160 ký tự)

### 6. Gợi ý Internal Links
- AI quét nội dung bài → gợi ý link đến các tool hoặc bài blog khác trong hệ thống
- Giúp tăng internal linking cho SEO

### 7. Tạo bài từ Tool có sẵn
- Chọn 1 hoặc nhiều tool từ DB → AI viết bài review/so sánh/roundup
- Tự động kéo data: tên, mô tả, pricing, pros/cons từ `tools` + `ai_scores`

---

### Đề xuất ưu tiên triển khai

Tôi đề xuất chia thành 2 phase:

**Phase 1** (core):
1. Edge function `generate-blog-post` - viết bài tự động từ chủ đề
2. Thêm SEO fields vào DB + UI nhập SEO trong BlogFormDialog
3. Nút "Tạo SEO tự động" từ nội dung bài
4. Auto-generate excerpt khi trống

**Phase 2** (nâng cao):
5. SEO score analyzer
6. AI rewrite selected text trong editor
7. Gợi ý internal links
8. Tạo bài từ tool có sẵn

### Thay đổi kỹ thuật (Phase 1)

| File | Thay đổi |
|------|----------|
| DB migration | Thêm `seo_title`, `seo_description`, `seo_keywords` vào `blog_posts` |
| `supabase/functions/generate-blog-post/index.ts` | Edge function mới: nhận topic + type → AI viết bài HTML + SEO metadata |
| `src/pages/admin/AdminBlog.tsx` | Thêm nút "Viết bằng AI", SEO fields, nút "Tạo SEO tự động" vào BlogFormDialog |
| `supabase/config.toml` | Đăng ký function mới |

Bạn muốn triển khai phase nào trước, hoặc muốn điều chỉnh ý tưởng nào?

