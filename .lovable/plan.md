

## Plan: Thêm chức năng Admin tạo Launch

### Thay đổi

**File: `src/pages/admin/AdminLaunches.tsx`**

Thêm dialog "Tạo Launch" với form đầy đủ cho admin:

- State mới: `showCreateDialog`, `createForm` (product_name, tagline, description, website_url, logo_url, category_id, pricing_type, features, video_url, maker_comment, trial_url, is_coming_soon, scheduled_at, status)
- Nút "Tạo Launch" ở header cạnh filter
- Dialog form bao gồm tất cả trường giống LaunchSubmitForm nhưng:
  - Admin có thể chọn status trực tiếp (approved/featured/pending)
  - Admin có thể chọn tool liên kết (search tools)
  - maker_id = admin's user ID
  - Không cần chờ duyệt
- Query categories và tools search giống LaunchSubmitForm
- Sau khi tạo: invalidate queries, audit log, toast, đóng dialog

Không cần migration vì bảng `launches` đã có đủ cột. RLS policy "Users can submit launches" cho phép `auth.uid() = maker_id`, và "Users can update own launches" cũng cho admin qua `has_role` check -- admin cần insert với `maker_id = auth.uid()`.

