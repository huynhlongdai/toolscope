

## Nâng cấp form Launch sản phẩm

### Vấn đề
Form submit hiện tại chỉ có 2 trường (tagline + description), không đủ thông tin để giới thiệu sản phẩm. Bảng `launches` đã có `tool_id` và `screenshots` nhưng form không sử dụng.

### Giải pháp

**1. Mở rộng database `launches`** - thêm các cột:
- `product_name` (text) - tên sản phẩm
- `website_url` (text) - link website
- `logo_url` (text) - logo sản phẩm
- `category_id` (uuid) - danh mục
- `pricing_type` (text) - loại giá (free/freemium/paid)
- `features` (text[]) - danh sách tính năng chính
- `video_url` (text) - link video demo (YouTube)
- `maker_comment` (text) - lời giới thiệu từ maker

**2. Nâng cấp form submit** thành multi-step hoặc form đầy đủ:
- **Thông tin cơ bản**: Tên sản phẩm, tagline, website URL, logo upload
- **Chi tiết**: Mô tả đầy đủ, tính năng nổi bật (thêm/xóa động), pricing type, category
- **Media**: Upload screenshots (đã có cột), video demo URL
- **Maker comment**: Lời giới thiệu cá nhân từ maker

**3. Cho phép liên kết tool có sẵn** - nếu tool đã tồn tại trong DB, user có thể chọn từ danh sách thay vì nhập lại thông tin.

**4. Cập nhật hiển thị trên LaunchesPage** và **AdminLaunches** để show đầy đủ thông tin mới (logo, website, features, pricing).

### Tệp thay đổi
- Migration SQL mới cho cột bổ sung
- `src/pages/LaunchesPage.tsx` - form + hiển thị
- `src/pages/admin/AdminLaunches.tsx` - hiển thị thông tin đầy đủ hơn

