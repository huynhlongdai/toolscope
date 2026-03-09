

## Plan: Nâng cấp trang Category với tìm kiếm, bộ lọc và chế độ xem

### Phân tích hiện tại
Trang CategoryPage hiện chỉ có: breadcrumb, sub-category tabs, G2 Grid Chart, và grid tool cards. Không có tìm kiếm, bộ lọc, sắp xếp, hay chế độ xem list.

Bảng `tools` không có cột `has_free_trial` — cần thêm migration.

### Thay đổi

**1. Migration: Thêm cột `has_free_trial` vào bảng `tools`**
- `ALTER TABLE tools ADD COLUMN has_free_trial boolean NOT NULL DEFAULT false;`

**2. Cập nhật `src/pages/CategoryPage.tsx`** — thêm các tính năng:

- **Thanh tìm kiếm**: Input filter theo tên/mô tả (client-side filter trên kết quả đã fetch)
- **Bộ lọc giá**: Dropdown/pills cho pricing_type (Tất cả / Miễn phí / Freemium / Trả phí / Open Source)
- **Bộ lọc Trial**: Toggle/checkbox "Có dùng thử miễn phí"
- **Bộ lọc đánh giá**: Chỉ hiện tool có rating ≥ 4 sao
- **Sắp xếp**: Dropdown (Phổ biến / Đánh giá cao / Mới nhất / A-Z)
- **Chế độ xem**: Toggle Grid/List (giống ToolsPage)
- **Đếm kết quả**: Hiển thị số tool sau khi lọc
- **Nút xóa bộ lọc**: Khi có filter active

**3. Layout bộ lọc:**
```text
┌─────────────────────────────────────────────┐
│ [🔍 Tìm kiếm...]  [Giá ▼] [Sắp xếp ▼] [Grid|List] │
│ [□ Có dùng thử]  [□ Rating ≥ 4]                      │
│ [active filter badges... ✕]  [Xóa bộ lọc]            │
└─────────────────────────────────────────────┘
```

**4. Chế độ xem List**: Tái sử dụng `ToolCard` với layout khác — hoặc render dạng hàng ngang (logo + tên + mô tả + giá + rating trên 1 dòng) bằng cách thêm prop `variant="list"` vào ToolCard.

**5. Cập nhật `src/components/tools/ToolCard.tsx`**:
- Thêm prop `variant?: "grid" | "list"` 
- Variant `list`: layout 1 hàng ngang, compact, hiển thị nhiều info hơn trên 1 dòng

### Ý tưởng bổ sung (sẽ implement luôn)
- **Sticky filter bar**: Thanh lọc dính khi cuộn trang
- **Số lượng tool mỗi filter**: Hiển thị count bên cạnh option (VD: "Miễn phí (12)")
- **Sort mặc định theo AI Score**: Thêm option sắp xếp theo AI Score nếu có

### File ảnh hưởng
1. **Migration**: Thêm cột `has_free_trial` vào `tools`
2. **Sửa**: `src/pages/CategoryPage.tsx` — toàn bộ logic filter/search/sort/view
3. **Sửa**: `src/components/tools/ToolCard.tsx` — thêm variant list

