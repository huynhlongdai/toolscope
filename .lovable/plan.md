

## Plan: Gộp 3 tính năng — Blog Sidebar, Workflow Menu, Editor WordPress-style

### 1. Thêm Workflows vào navigation menu

**File:** `src/components/layout/Header.tsx`, `src/lib/translations/vi.ts`, `src/lib/translations/en.ts`

- Thêm `{ label: "Workflows", url: "/workflows" }` vào `defaultNavItems` (sau "Launches")
- Thêm key `nav.workflows` vào cả 2 file dictionary

### 2. Blog Detail — Sidebar nội dung liên quan

**File:** `src/pages/BlogDetail.tsx`

Chuyển layout từ 1 cột (`max-w-3xl`) sang 2 cột:

```text
container max-w-6xl flex gap-8
├── article (flex-1, min-w-0)     ← nội dung bài viết (giữ nguyên)
└── aside (w-80, hidden lg:block) ← sidebar mới
    ├── Table of Contents (parse H2/H3 từ content)
    ├── Related Posts (query blog_posts cùng tags, limit 5)
    ├── Related Tools (chuyển từ cuối bài lên sidebar)
    └── Tags cloud (chuyển từ trong bài lên sidebar)
```

- Mobile: sidebar ẩn, related content vẫn hiển thị cuối bài
- Query related posts: `WHERE status='published' AND id != current AND tags && current_tags LIMIT 5`

### 3. Nâng cấp RichTextEditor theo WordPress

**File:** `src/components/admin/RichTextEditor.tsx`

**Fixes:**
- Đăng ký `Underline` extension từ `@tiptap/extension-underline` (hiện thiếu → nút bấm lỗi)
- Đăng ký `Link` extension từ `@tiptap/extension-link` riêng (StarterKit link config không đủ)

**Toolbar 2 hàng kiểu WordPress:**
```text
Row 1: [Paragraph ▾] | B I U S | Color | Highlight | Clear format
Row 2: Align | List | Link | Media | Table | Blocks | Undo/Redo
```

- Block type selector: dropdown chọn Paragraph / H1-H4 / Quote / Code (thay vì 4 nút H riêng)
- Link Popover: thay `prompt()` bằng Popover có input URL + checkbox "open in new tab"

**Tính năng mới:**
- **Fullscreen mode**: toggle button, editor mở `fixed inset-0 z-50 bg-background`
- **Word count + reading time**: footer bar hiển thị số từ + ước tính (200 từ/phút)
- **Drag & drop image**: `onDrop` handler trên editor area → upload lên `editor-images` bucket → insert
- **Block inserter "+"**: panel có icon + label + mô tả (giống WordPress block inserter) thay dropdown text thuần

### Thứ tự triển khai

1. Header + translations (nhỏ, nhanh)
2. RichTextEditor (lớn nhất, refactor toàn bộ)
3. BlogDetail sidebar (layout + query mới)

