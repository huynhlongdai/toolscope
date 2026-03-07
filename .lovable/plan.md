

## Rà soát & Nâng cấp Module Tools Admin - Tối ưu Mobile

### Vấn đề phát hiện

1. **Mobile: Dialog form quá chật** - `max-w-4xl` dialog với `grid-cols-8` tabs không hiển thị được trên mobile, text bị cắt
2. **Mobile: Bảng tools tràn ngang** - 8 cột table không responsive, buộc scroll ngang
3. **Mobile: Filter bar chưa tối ưu** - 5 filter nằm cạnh nhau, chiếm nhiều không gian
4. **Mobile: Pending submissions card** - Các nút hành động bị chồng trên màn hình nhỏ
5. **Mobile: BatchTranslate + header buttons** - Nhiều nút nhỏ bị dồn
6. **Tab Dịch chưa có badge** - Tab "Dịch" không hiển thị số ngôn ngữ đã dịch

### Kế hoạch thực hiện

#### 1. Responsive TabsList trong ToolFormDialog
- Thay `grid-cols-8` bằng `flex flex-wrap` hoặc `ScrollArea` horizontal trên mobile
- Sử dụng text ngắn hơn trên mobile hoặc scroll ngang cho tabs
- Tab "Dịch" hiển thị badge count: `Dịch (3/10)`

#### 2. Responsive Table → Card layout trên mobile
- Trên mobile (`md:` breakpoint), chuyển bảng tools thành dạng card list
- Mỗi card hiển thị: logo + name, status badge, category, flags ngôn ngữ, action buttons
- Ẩn cột Rating/Views trên mobile, chỉ hiện trên desktop
- Giữ nguyên table cho desktop

#### 3. Tối ưu Filter bar mobile
- Trên mobile: collapse filters vào một nút "Bộ lọc" mở Sheet/Drawer chứa tất cả filter
- Hiển thị badge count filter đang active
- Giữ search input luôn hiển thị

#### 4. Tối ưu Pending submissions mobile
- Stack nút hành động (Xem/Duyệt/Từ chối) theo chiều dọc trên mobile
- Thu gọn text nút, chỉ hiện icon trên mobile

#### 5. Tối ưu Header actions mobile
- Gom các nút CSV/Import/BatchTranslate vào dropdown menu trên mobile
- Chỉ giữ nút "Thêm" luôn hiển thị

#### 6. Dialog form mobile
- `DialogContent` full-width trên mobile: thêm class `w-full sm:max-w-4xl`
- TabsList scroll horizontal thay vì grid cố định

### Technical Details

**File chỉnh sửa**: `src/pages/admin/AdminTools.tsx`

- Import `Sheet`/`Drawer` hoặc dùng `Popover` cho filter collapse
- Import `DropdownMenu` cho header actions gom nhóm
- Import `ScrollArea` cho horizontal tab scroll
- Thêm `useIsMobile` hook để toggle layout
- Table: render 2 layout khác nhau dựa trên breakpoint (CSS `hidden md:table-cell` cho cột phụ, hoặc hoàn toàn thay bằng card list khi mobile)
- ToolFormDialog: `TabsList` dùng `overflow-x-auto flex` thay `grid-cols-8`
- Pending card: flex-col trên mobile cho action buttons

