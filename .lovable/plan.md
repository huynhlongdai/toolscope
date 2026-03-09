

## Plan: Đưa DealsSection lên đầu sidebar + Sticky sidebar

### Thay đổi trong `src/pages/ToolDetail.tsx`

**1. Đổi thứ tự sidebar:**
- Di chuyển `<DealsSection>` lên **trước** AI Score (đầu tiên trong sidebar)

**2. Sticky sidebar:**
- Thêm `sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto` vào div sidebar (`space-y-6`)
- Sidebar sẽ luôn hiển thị khi cuộn nội dung bên trái
- `top-20` để tránh đè lên header
- `overflow-y-auto` để sidebar vẫn cuộn được nếu nội dung sidebar dài hơn viewport

### File ảnh hưởng
- `src/pages/ToolDetail.tsx`

