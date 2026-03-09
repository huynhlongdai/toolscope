
## Plan: Bổ sung loại quảng cáo "Hình ảnh"

### Các thay đổi cụ thể

**1. Cập nhật `AdUnit.tsx` để hiển thị hình ảnh**
- Mở rộng kiểu dữ liệu `AdsConfig` thêm `mode: "image"` cùng với `image_url` và `link_url`.
- Thêm logic xử lý khi hiển thị: Nếu quảng cáo đang ở chế độ `image` và có `image_url`, component sẽ hiển thị một thẻ `<img>`. Nếu có cấu hình `link_url`, thẻ ảnh sẽ được bọc bên trong thẻ `<a>` để người dùng có thể nhấp vào.

**2. Cập nhật `AdsSettingsTab.tsx` để quản lý vị trí**
- Import component `CoverImageUpload` có sẵn để tận dụng tính năng tải ảnh lên Supabase Storage.
- Mở rộng cấu hình mặc định để hỗ trợ lưu `image_url` và `link_url`.
- Thêm một option "Hình ảnh (Upload)" vào danh sách thả xuống chọn loại quảng cáo.
- Xây dựng giao diện cấu hình riêng cho chế độ "image":
  - Component tải ảnh (`CoverImageUpload`).
  - Ô nhập "Link đích" (tùy chọn).
- Cập nhật phần `AdPreviewPanel` để có thể xem trước banner ảnh vừa tải lên.

### Danh sách các file bị ảnh hưởng
- `src/components/ads/AdUnit.tsx`
- `src/components/admin/AdsSettingsTab.tsx`
