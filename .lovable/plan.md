

## Kết quả kiểm tra

Database hiện có **29 tools** (21 published, 8 pending_review). Query không bị giới hạn 1000 rows. Vấn đề "không hiển thị đầy đủ" có thể do:
- Filter `statusFilter` nằm trong queryKey, nên khi chọn "all" vẫn fetch đúng, nhưng **client-side filter thêm nhiều lớp** (category, pricing, health, translation) có thể ẩn tool mà admin không nhận ra
- Khi search có text, filter case-sensitive chỉ match `name` mà không match `short_description`
- Phân trang 50/trang — không phải vấn đề với 29 tools

## Plan: Tối ưu module quản lý Tool

### 1. Sửa bug hiển thị danh sách
- **Mở rộng search**: match cả `short_description`, `website_url` (không chỉ `name`)
- **Hiển thị count luôn**: luôn hiển thị `"X / Y tools"` dù chỉ 1 trang (hiện chỉ show khi > 1 trang)
- **Active filter badges**: hiển thị các filter đang active dưới thanh lọc, có nút "Xóa tất cả" để reset

### 2. Server-side pagination (chuẩn bị scale)
- Khi số tool tăng lên 500+, query `select *` sẽ chậm
- Chuyển sang **server-side pagination**: truyền `range()` trong query, search bằng `.ilike()` thay vì client-side filter
- QueryKey bao gồm tất cả filter + page để cache đúng

### 3. Bulk actions (thao tác hàng loạt)
- Thêm **checkbox chọn nhiều tool** (select all / select individual)
- Actions: Publish hàng loạt, Archive hàng loạt, Xóa hàng loạt, Đổi category hàng loạt
- Hiện thanh action bar khi có tool được chọn

### 4. Quick Edit inline
- Click vào tên tool để inline edit tên (không cần mở dialog)
- Click vào category để đổi category nhanh bằng dropdown
- Click vào pricing badge để đổi pricing nhanh

### 5. Cải thiện UX
- **Drag sort** (tùy chọn): cho phép kéo thả để đổi thứ tự hiển thị (thêm cột `sort_order` nếu cần)
- **Preview link**: nút xem trước trang tool trên frontend (link đến `/tool/:slug`)
- **Duplicate tool**: nút nhân bản tool nhanh
- **Thống kê tổng quan**: card thống kê ở đầu trang (Tổng tool, Published, Draft, Pending, Dead)

### File thay đổi
1. **Sửa**: `src/pages/admin/AdminTools.tsx` — search mở rộng, server-side pagination, bulk actions, inline edit, stats cards, always-show count, active filter badges

