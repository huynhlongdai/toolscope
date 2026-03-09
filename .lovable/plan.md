

## Plan: Hoàn thiện Bulk Actions cho Moderation Queue

### Phân tích hiện tại
Đã có: bulk approve tools, bulk approve reviews, bulk delete comments. 
Thiếu:
- **Bulk reject tools** (từ chối hàng loạt)
- **Bulk reject/delete reviews** (từ chối hàng loạt)
- **Select All** checkbox ở mỗi tab
- Bulk actions cho **Questions**, **Launch Comments**, **Flagged Comments**

### Thay đổi trong `src/pages/admin/AdminModeration.tsx`

**1. Thêm bulk reject functions:**
- `bulkRejectTools`: update status → `archived` cho tất cả selected tools
- `bulkRejectReviews`: delete selected reviews

**2. Thêm Select All checkbox** ở mỗi tab (Tools, Reviews, Comments, Questions, Launch Comments, Flagged):
- Checkbox header "Chọn tất cả" toggle toàn bộ items trong tab

**3. Thêm bulk actions cho các tab còn thiếu:**
- **Questions**: checkbox + bulk delete
- **Launch Comments**: checkbox + bulk delete  
- **Flagged**: checkbox + bulk delete + bulk ban users

**4. Cải thiện action bar:**
- Hiện cả nút "Duyệt" và "Từ chối" trong bulk action bar cho Tools & Reviews
- Thêm count rõ ràng: "3/10 đã chọn"

### File thay đổi
1. **Sửa**: `src/pages/admin/AdminModeration.tsx`

