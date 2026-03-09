

## Plan: Hiển thị bảng giá chi tiết (pricing_details) trên trang tool detail

### Phân tích
- Bảng `tools` đã có cột `pricing_details` (JSON) chứa mảng các gói giá thu thập được, mỗi gói có `name`, `price`, `currency`, `features`.
- Dữ liệu này đã được thu thập qua edge function `collect-tool-data` và quản lý trong admin, nhưng chưa hiển thị trên trang chi tiết công cụ.

### Thay đổi

**1. Tạo component `PricingPlansCard`** (`src/components/tool-detail/PricingPlansCard.tsx`)
- Nhận `pricingDetails` (JSON array) và `pricingType` làm props.
- Hiển thị dạng card grid với mỗi gói giá: tên gói, giá, currency, danh sách features.
- Highlight gói phổ biến nhất (nếu có).
- Nếu `pricing_details` rỗng hoặc null, không render gì cả.

**2. Cập nhật `ToolDetail.tsx`**
- Truyền `tool.pricing_details` vào query select (đã có sẵn vì select `*`).
- Import và đặt `PricingPlansCard` vào phần main content, ngay sau phần "Giới thiệu" và trước `DetailedArticle`.
- Props: `pricingDetails={tool.pricing_details}`, `pricingType={tool.pricing_type}`.

### Giao diện dự kiến
- Mỗi gói giá hiển thị trong 1 card nhỏ với tên gói, giá `$X/tháng`, và danh sách tính năng dạng checklist.
- Responsive: 1 cột mobile, 2-3 cột desktop.
- Icon `CreditCard` cho tiêu đề section.

### File ảnh hưởng
- `src/components/tool-detail/PricingPlansCard.tsx` (mới)
- `src/pages/ToolDetail.tsx` (thêm import + render)

