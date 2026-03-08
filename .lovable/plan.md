

## Nâng cấp SEO cho hệ thống tạo Blog bằng AI

### Vấn đề hiện tại

Prompt tạo blog hiện tại (`generate-blog-post/index.ts`) quá đơn giản, thiếu các yêu cầu SEO chuyên sâu:

1. **Tiêu đề**: Không yêu cầu chứa keyword chính, không có power words, không tối ưu CTR
2. **Nội dung**: Không có hướng dẫn về keyword density, không yêu cầu internal linking, không có image placeholders với alt text
3. **Cấu trúc HTML**: Thiếu schema markup gợi ý, không có `<figure>/<figcaption>` cho hình ảnh, không có FAQ schema
4. **Meta tags**: SEO title/description quá generic, không có hướng dẫn về search intent
5. **Excerpt**: Không tối ưu cho social sharing (Open Graph preview)
6. **Thiếu tính năng**: Không có SEO score/checklist để đánh giá chất lượng bài viết trước khi publish

---

### Kế hoạch thực hiện

#### 1. Nâng cấp prompt `generate-blog-post/index.ts` — action `"generate"`

Thay prompt hiện tại bằng prompt SEO-focused chi tiết hơn:

- **Tiêu đề**: Yêu cầu chứa primary keyword ở đầu, dùng power words (Ultimate, Best, Complete...), độ dài 50-60 ký tự, tạo curiosity/urgency
- **Cấu trúc nội dung**:
  - Mở đầu: Hook sentence + primary keyword trong 100 từ đầu
  - H2/H3: Chứa secondary keywords, dạng câu hỏi (People Also Ask friendly)
  - Paragraphs: Ngắn gọn (2-3 câu), dùng transition words
  - Lists: Có numbered lists và bullet points (featured snippet friendly)
  - `<figure>` + `<figcaption>` với image placeholders có alt text chứa keyword
  - Internal link placeholders: `[INTERNAL_LINK: topic]`
  - CTA trong bài (giữa và cuối)
  - FAQ section cuối bài (FAQ schema ready)
- **Từ khóa**: Yêu cầu trả về `primary_keyword`, `secondary_keywords[]`, `lsi_keywords[]`
- **Độ dài**: Tùy theo type (listicle: 1500-2500, guide: 2000-3500, comparison: 1800-3000)

#### 2. Nâng cấp prompt action `"generate_seo"`

- SEO title: Chứa primary keyword + power word + số (nếu có) + brand
- Meta description: Chứa primary keyword trong 30 ký tự đầu, có CTA, 150-160 chars
- Trả về thêm: `primary_keyword`, `search_intent` (informational/transactional/navigational), `content_score` (1-100), `improvement_suggestions[]`

#### 3. Thêm action mới `"seo_audit"` trong edge function

Action mới phân tích nội dung đã viết và trả về SEO score + gợi ý cải thiện:
- Keyword density check
- Heading structure analysis
- Meta tag quality
- Readability score
- Image alt text check
- Internal/external link ratio
- Content length assessment
- FAQ presence

#### 4. Thêm SEO Score Panel trong `AdminBlog.tsx` (BlogFormDialog)

Trong tab "SEO & Tools", thêm panel hiển thị:
- **SEO Score** (0-100) với màu xanh/vàng/đỏ
- Checklist items: ✅/❌ cho từng tiêu chí (title length, meta description, keyword in H1, image alt, FAQ section...)
- Nút "Phân tích SEO" gọi action `seo_audit`
- Hiển thị gợi ý cải thiện cụ thể

#### 5. Thêm image placement suggestions

Trong prompt generate, yêu cầu AI đánh dấu vị trí nên chèn hình ảnh:
```html
<figure data-image-suggestion="screenshot of [tool] dashboard">
  <img src="" alt="[Tool Name] dashboard showing [feature] - [keyword]" />
  <figcaption>[Mô tả hình ảnh]</figcaption>
</figure>
```
Admin sẽ thấy placeholder và tự upload hình phù hợp.

---

### Files chỉnh sửa

- `supabase/functions/generate-blog-post/index.ts` — nâng cấp prompts cho action `generate`, `generate_seo`, thêm action `seo_audit`
- `src/pages/admin/AdminBlog.tsx` — thêm SEO Score Panel, nút Audit SEO trong BlogFormDialog

