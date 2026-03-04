

## Plan: Tự động chuyển đổi Markdown → HTML khi mở editor

### Vấn đề
Khi mở chỉnh sửa tool, nội dung Markdown từ DB được truyền thẳng vào TipTap editor dưới dạng text thô. TipTap chỉ hiểu HTML, nên `## Heading` hiển thị thành text "## Heading" thay vì heading thật. Nút "Chuyển Markdown → HTML" yêu cầu bấm thủ công -- dễ quên và không trực quan.

### Giải pháp
Tự động detect và convert Markdown → HTML **ngay khi mở form chỉnh sửa tool**, trước khi truyền vào TipTap. Không cần nút bấm thủ công nữa.

### Thay đổi

**`src/pages/admin/AdminTools.tsx`** - ToolFormDialog:
- Khi `setEditTool(tool)` hoặc khởi tạo form từ DB data, kiểm tra `description` và `detailed_content` có phải Markdown không (dùng regex hiện có)
- Nếu là Markdown → tự động chạy `marked.parse()` chuyển sang HTML trước khi set vào form state
- Xóa nút "Chuyển Markdown → HTML" thủ công và warning banner (không cần nữa vì đã tự động)

**`src/pages/admin/AdminTools.tsx`** - ContentTabWithPreview:
- Đơn giản hóa: bỏ logic detect markdown, bỏ nút convert, bỏ warning
- Chỉ giữ Edit/Preview toggle

Cách tiếp cận này đảm bảo TipTap luôn nhận HTML đúng format, editor hiển thị heading/bold/list chính xác ngay lập tức.

