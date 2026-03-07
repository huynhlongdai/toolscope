

## Rà soát chi tiết: Toàn bộ hardcode tiếng Việt còn sót lại

Sau khi rà soát kỹ ~40 files, phát hiện **~200 chuỗi hardcode** tiếng Việt trải đều trên 5 trang public, 12 components, và các trang admin. Dưới đây là danh sách đầy đủ theo nhóm ưu tiên.

---

### NHÓM 1: Trang Public (ưu tiên cao nhất — user-facing)

| File | Số chuỗi | Chi tiết |
|------|----------|----------|
| **ProfilePage.tsx** | ~30 | "Người dùng", "điểm", "Tham gia", "Chỉnh sửa", "Tên hiển thị", "Username", "Bio", "Website", "Lưu", "Hủy", "Reviews", "Hoạt động", "Đã lưu", "Collections", "Bình luận", "Câu hỏi", "Chưa có review nào", "Chưa có hoạt động nào", "Bình luận gần đây", "Đã cập nhật profile", "Lỗi cập nhật", "Tạo mới", "Tạo Collection mới", "Công khai", "Riêng tư", "Chưa có collection nào", "Chưa lưu tool nào", "Không tìm thấy hồ sơ", date format "vi-VN" |
| **SubmitToolPage.tsx** | ~18 | "Gửi công cụ mới", "Giới thiệu công cụ...", "Tên công cụ", "Mô tả ngắn", "Mô tả chi tiết", "Loại giá", "Miễn phí", "Freemium", "Trả phí", "Open Source", "Liên hệ", "Chưa phân loại", "Đang gửi...", "Gửi công cụ", "Đã gửi thành công!", "Xem danh sách", "Gửi thêm", "Vui lòng đăng nhập", "Tên và URL là bắt buộc", "Bạn cần đăng nhập" |
| **WorkflowDetail.tsx** | ~18 | "Cơ bản", "Trung bình", "Nâng cao", "Không tìm thấy workflow", "← Quay lại Workflows", "Vấn đề", "Giải pháp", "Đối tượng", "Cần chuẩn bị", "Các bước thực hiện", "bước", "Lỗi thường gặp", "Pro Tips", "Video hướng dẫn", "Xem video tại đây", "Tools trong Workflow này" |
| **CollectionDetail.tsx** | ~8 | "Không tìm thấy collection", "← Quay lại", "Quay lại Collections", "bởi", "Ẩn danh", "Collection này chưa có tool nào", "Lỗi lưu ghi chú", "Đã lưu ghi chú", "Thêm ghi chú...", "Ghi chú..." |
| **NotFound.tsx** | ~5 | "Trang không tồn tại", "Đường dẫn...không được tìm thấy", "Có thể trang đã bị xóa...", "Trang chủ", "Khám phá công cụ", "Danh mục", "Quay lại trang trước" |
| **DynamicPage.tsx** | ~4 | "Không tìm thấy trang", "← Trang chủ", "Trang này chưa có nội dung", countdown labels "Ngày/Giờ/Phút/Giây", "Phổ biến nhất" |

### NHÓM 2: Components tool-detail (user-facing, critical)

| File | Số chuỗi | Chi tiết |
|------|----------|----------|
| **CommentSection.tsx** | ~15 | "Bình luận", "Viết bình luận...", "Đăng nhập để bình luận", "Gửi bình luận", "Ẩn danh", "Trả lời", "Báo cáo", "Hủy", "Gửi", "Lỗi", "Đã gửi bình luận!", "Đã gửi báo cáo", "Báo cáo bình luận", "Quấy rối", "Nội dung không phù hợp", "Thông tin sai lệch", "Chi tiết (tùy chọn)", "Gửi báo cáo", date format "vi-VN" |
| **QASection.tsx** | ~12 | "Hỏi & Đáp", "Đặt câu hỏi", "Tiêu đề câu hỏi", "Chi tiết (tùy chọn)", "Gửi", "Hủy", "Ẩn danh", "câu trả lời", "Trả lời...", "Đăng nhập để trả lời", "Chưa có câu hỏi nào...", "Đã đặt câu hỏi!", "Đã trả lời!", "Vui lòng đăng nhập" |
| **StructuredReviewForm.tsx** | ~15 | "Viết review", "Viết review có cấu trúc", "Dễ sử dụng", "Hỗ trợ KH", "Giá trị", "Khả năng giới thiệu (NPS)", "Tiêu đề review", "Điểm mạnh", "Bạn thích gì nhất?", "Điểm yếu", "Bạn không thích gì?", "Bạn dùng tool này cho việc gì?", "Chia sẻ trải nghiệm...", "Đang gửi...", "Gửi review", "Hủy", "Đã tạo bản nháp AI!", "Đã gửi review!", "Vui lòng điền tiêu đề và nội dung" |
| **ReviewBreakdown.tsx** | ~4 | "Đánh giá theo tiêu chí", "Dễ sử dụng", "Hỗ trợ KH", "Giá trị" |
| **VendorClaimButton.tsx** | ~12 | "Vui lòng đăng nhập", "Đã gửi yêu cầu claim!", "Lỗi khi gửi yêu cầu", "Đang chờ duyệt", "Đã được duyệt", "Bị từ chối", "Claim profile", "Nếu bạn là chủ sở hữu...", "URL xác minh", "Ghi chú", "Đang gửi...", "Gửi yêu cầu Claim", "Mô tả vai trò..." |
| **AlternativesSection.tsx** | ~1 | "Alternatives cho {name}" |
| **PricingHistoryChart.tsx** | ~4 | "Lịch sử giá", "Chưa có dữ liệu lịch sử giá", "Giá sẽ được cập nhật định kỳ", "Giá" (tooltip) |
| **DetailedArticle.tsx** | ~8 | Section icons keys ("là gì", "tính năng", "nổi bật"...), "Quay lại đầu trang", "Chưa có bài giới thiệu chi tiết..." |

### NHÓM 3: Components khác (user-facing)

| File | Số chuỗi | Chi tiết |
|------|----------|----------|
| **DealCard.tsx** | ~6 | "Hết hạn", "Dùng thử miễn phí", "Độc quyền", "Đã xác minh", "Còn", "Vui lòng đăng nhập để bình chọn" |
| **DealDetailModal.tsx** | ~6 | "Ưu đãi cho", "Độc quyền", "Đã xác minh", "Mã giảm giá", "Còn", "Nhận ưu đãi", "Đã copy mã giảm giá!" |
| **DealsSection.tsx** | ~1 | "Ưu đãi" |
| **LaunchSubmitForm.tsx** | ~18 | "Liên kết tool có sẵn", "Tìm tool đã có...", "Đã liên kết với tool có sẵn", "Tên sản phẩm", "Tagline", "Mô tả chi tiết", "Danh mục", "Chọn danh mục", "Tính năng nổi bật", "Logo URL", "Video demo URL", "Lời giới thiệu từ Maker", "Đang gửi...", "🚀 Gửi để duyệt", "Sản phẩm sẽ được admin duyệt...", "Đã gửi!", "Lỗi khi gửi" |
| **AddToCollectionDialog.tsx** | ~7 | "Vui lòng đăng nhập", "Thêm vào Collection", "Ghi chú về tool này...", "Quay lại", "Thêm", "Ghi chú (tùy chọn)...", "Tên collection...", "Tạo", "Tạo collection mới" |
| **FollowButton.tsx** | ~2 | "Đang theo dõi", "Theo dõi" |
| **UpvoteButton.tsx** | ~1 | "Vui lòng đăng nhập để vote" |
| **VoteButtons.tsx** | ~1 | "Vui lòng đăng nhập" |
| **AIChatWidget.tsx** | ~6 | "Xin chào! Tôi là ToolScope AI", "Hỏi tôi bất cứ điều gì...", "Gợi ý:", SUGGESTIONS array (3 items), "Không thể kết nối đến AI...", "Hỏi về công cụ..." |
| **Header.tsx** | ~1 | defaultNavItems labels: "Khám phá" (hardcode fallback) |

---

### KẾ HOẠCH THỰC HIỆN

#### Bước 1: Thêm ~150 translation keys vào `vi.ts` và `en.ts`
Nhóm keys mới:
- `profile.*` (~30 keys)
- `submit.*` (~18 keys) 
- `workflowDetail.*` (~18 keys)
- `collectionDetail.*` (~8 keys)
- `notFound.*` (~5 keys)
- `dynamicPage.*` (~4 keys)
- `comments.*` (~15 keys)
- `qa.*` (~12 keys)
- `reviewForm.*` (~15 keys)
- `reviewBreakdown.*` (~4 keys)
- `vendorClaim.*` (~12 keys)
- `alternatives.*` (~1 key)
- `pricingHistory.*` (~4 keys)
- `detailedArticle.*` (~3 keys)
- `deals.card.*` (~6 keys)
- `deals.modal.*` (~6 keys)
- `deals.section.*` (~1 key)
- `launchForm.*` (~18 keys)
- `addToCollection.*` (~7 keys)
- `follow.*` (~2 keys)
- `chat.*` (~6 keys)
- `common.*` mở rộng: loginRequired, saving, error, success, cancel, submit, back, anonymous, loading...

#### Bước 2: Cập nhật 5 trang public → thêm `useI18n` + thay hardcode bằng `t()`
- `ProfilePage.tsx`
- `SubmitToolPage.tsx`
- `WorkflowDetail.tsx`
- `CollectionDetail.tsx`
- `NotFound.tsx`
- `DynamicPage.tsx`

#### Bước 3: Cập nhật ~14 components → thêm `useI18n` + thay hardcode
- `CommentSection.tsx`, `QASection.tsx`, `StructuredReviewForm.tsx`, `ReviewBreakdown.tsx`
- `VendorClaimButton.tsx`, `AlternativesSection.tsx`, `PricingHistoryChart.tsx`, `DetailedArticle.tsx`
- `DealCard.tsx`, `DealDetailModal.tsx`, `DealsSection.tsx`
- `LaunchSubmitForm.tsx`, `AddToCollectionDialog.tsx`
- `FollowButton.tsx`, `UpvoteButton.tsx`, `VoteButtons.tsx`
- `AIChatWidget.tsx`

#### Bước 4: Fix date format theo locale
Nhiều file dùng hardcode `toLocaleDateString("vi-VN")`. Cần thay bằng locale-aware format (dùng `locale` từ `useI18n` để map sang locale string phù hợp).

### Files chỉnh sửa (tổng ~23 files)
- `src/lib/translations/vi.ts` — thêm ~150 keys
- `src/lib/translations/en.ts` — thêm ~150 keys
- 6 files trong `src/pages/`
- 17 files trong `src/components/`

