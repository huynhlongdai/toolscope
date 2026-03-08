

## Plan: Sửa lỗi Tasks UI và Module bật/tắt không hoạt động

### Vấn đề phát hiện

**1. Module bật/tắt không có tác dụng**
- Hook `useModules().isEnabled()` tồn tại nhưng **không được sử dụng ở bất kỳ đâu** trong app
- `App.tsx`: Tất cả routes luôn render bất kể module bật/tắt
- `Header.tsx`: Menu navigation dùng hardcoded items hoặc DB menu, không kiểm tra module

**2. Tasks page vỡ UI**
- Thiếu i18n keys: `tasks.suggest`, `tasks.suggestTitle`, `tasks.searchPlaceholder` — hiển thị raw key thay vì text
- `TaskSuggestDialog` thiếu `DialogDescription` gây warning accessibility

### Thay đổi cụ thể

#### 1. Thêm i18n keys thiếu cho Tasks
- **`src/lib/translations/vi.ts`**: Thêm `tasks.suggest`, `tasks.suggestTitle`, `tasks.searchPlaceholder`
- **`src/lib/translations/en.ts`**: Tương tự

#### 2. Fix TaskSuggestDialog accessibility
- **`src/components/tasks/TaskSuggestDialog.tsx`**: Thêm `DialogDescription` để tránh warning

#### 3. Áp dụng module filtering vào Routes
- **`src/App.tsx`**: Tạo wrapper component sử dụng `useModules().isEnabled()` để ẩn routes của module bị tắt. Các module-route mapping:
  - `blog` → `/blog`, `/blog/:slug`
  - `workflows` → `/workflows`, `/workflow/:slug`
  - `deals` → `/deals`
  - `launches` → `/launches`, `/launch/:id`
  - `tasks` → `/tasks`
  - `collections` → `/collections`, `/collection/:id`
  - `compare` → `/compare`
  - `leaderboard` → `/leaderboard`
  - `submit_tool` → `/submit`
- Routes bị tắt redirect đến NotFound hoặc trang chủ

#### 4. Áp dụng module filtering vào Header navigation
- **`src/components/layout/Header.tsx`**: Import `useModules`, filter `defaultNavItems` và DB menu items dựa theo module enabled status. Mapping URL → module ID để ẩn link khi module tắt

### Files thay đổi

| File | Thay đổi |
|---|---|
| `src/lib/translations/vi.ts` | Thêm 3 i18n keys |
| `src/lib/translations/en.ts` | Thêm 3 i18n keys |
| `src/components/tasks/TaskSuggestDialog.tsx` | Thêm DialogDescription |
| `src/App.tsx` | Module-aware route filtering |
| `src/components/layout/Header.tsx` | Filter nav items theo module |
| `src/components/layout/MobileBottomNav.tsx` | Filter nav items theo module (nếu cần) |

### Thứ tự triển khai
1. Fix i18n + TaskSuggestDialog accessibility
2. Implement module filtering cho routes (App.tsx)
3. Implement module filtering cho navigation (Header + MobileBottomNav)

