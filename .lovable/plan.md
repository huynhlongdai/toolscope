

## Nâng cấp CollectAI: Tìm kiếm từ văn bản & file upload

### Tính năng mới
Cho phép admin paste nội dung văn bản hoặc upload file (PDF, Excel, Markdown, CSV) chứa danh sách công cụ AI → hệ thống dùng AI phân tích và trích xuất thành collect items tự động.

### Luồng hoạt động

```text
Admin paste text / upload file
        │
        ▼
Frontend gửi lên edge function
  (text content hoặc file → storage → URL)
        │
        ▼
collect-ai action="parse-content"
        │
        ├── Text thuần → gửi thẳng cho AI parse
        ├── File upload → đọc nội dung file
        │     ├── .md, .csv, .txt → đọc text trực tiếp
        │     ├── .pdf → dùng AI vision hoặc text extract
        │     └── .xlsx → parse JSON từ CSV export
        │
        ▼
AI trích xuất danh sách tools → lưu staging
```

### Kế hoạch thực hiện

#### 1. Storage bucket cho file upload
- Tạo bucket `collect-uploads` (private) để lưu file tạm

#### 2. Cập nhật Edge Function `collect-ai`
- Thêm action `parse-content`:
  - Nhận `content_text` (văn bản paste) hoặc `file_url` + `file_type`
  - Đọc nội dung file từ storage (hỗ trợ txt, md, csv, pdf)
  - Với PDF: dùng Gemini vision model để đọc
  - Gửi nội dung cho AI parse thành danh sách tools (cùng format parseToolsWithAI hiện có)
  - Tạo session + lưu items vào staging

#### 3. Cập nhật UI AdminCollectAI.tsx
- Thêm search type mới: `"text"` (Từ văn bản/file)
- Khi chọn type "text":
  - Hiện textarea để paste nội dung
  - Hiện nút upload file (accept: .pdf, .xlsx, .csv, .md, .txt)
  - File upload → storage bucket → gửi URL cho edge function
- Giữ nguyên flow staging/import hiện tại

### Files chỉnh sửa
- `supabase/functions/collect-ai/index.ts` — thêm action `parse-content`
- `src/pages/admin/AdminCollectAI.tsx` — thêm UI paste text + upload file
- DB migration: tạo storage bucket `collect-uploads` + RLS

### Chi tiết kỹ thuật

**AI Parse prompt**: Tái sử dụng logic `parseToolsWithAI` với search_type mới `"content"`, prompt yêu cầu AI trích xuất tên tool, URL, mô tả từ nội dung tự do.

**File handling trong Edge Function**:
- Đọc file từ Supabase Storage bằng service role
- PDF: gửi base64 cho Gemini multimodal (vision) để extract text
- CSV/Excel: parse dạng text, mỗi dòng là 1 entry
- Markdown/Text: gửi trực tiếp cho AI

**Upload flow (frontend)**:
1. User chọn file → upload lên `collect-uploads` bucket
2. Lấy public/signed URL
3. Gọi `collect-ai` với `{ action: "parse-content", file_url, file_type }`
4. Hoặc paste text → gọi `{ action: "parse-content", content_text }`

