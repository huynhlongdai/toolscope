

## Plan nâng cấp module Workflow + Dịch đa ngôn ngữ

### Phân tích hiện trạng

**Đã có:**
- Admin CRUD workflows với AI generation (4 chế độ regen)
- Tab dịch trong form editor workflow (dùng `EntityTranslationEditor` gọi `translate-blog`)
- Edge function `translate-blog` đã hỗ trợ cả blog + workflow
- WorkflowDetail hiển thị nội dung gốc (VI), chưa dùng `useTranslatedContent`

**Thiếu:**
- WorkflowDetail **không hiển thị nội dung đã dịch** cho user — chưa dùng `useTranslatedContent`
- WorkflowsPage (listing) **không dịch** title/description
- ContentTranslationsTab **không bao gồm workflow** — chỉ query tool/blog/menu, không fetch workflows, không hiển thị untranslated workflows
- Không dịch `seo_content` (problem, solution, tips, mistakes...) và `steps` — chỉ dịch 4 field cơ bản
- Entity filter trong ContentTranslationsTab thiếu option "Workflow"

### Thay đổi

#### 1. WorkflowDetail — hiển thị nội dung đã dịch (`src/pages/WorkflowDetail.tsx`)
- Import `useTranslatedContent` 
- Dịch 4 field: `title`, `description`, `seo_title`, `seo_description`
- Hiển thị translated title/description thay cho gốc khi có bản dịch

#### 2. WorkflowsPage — dịch listing (`src/pages/WorkflowsPage.tsx`)
- Import `useTranslatedList` 
- Batch-translate `title` và `description` cho tất cả workflows trong danh sách

#### 3. ContentTranslationsTab — thêm workflow (`src/components/admin/translations/ContentTranslationsTab.tsx`)
- Fetch workflows (`select id, title, slug, description from workflows where status=published`)
- Tính `untranslatedWorkflows` + `workflowPercent`
- Thêm `translateWorkflowMutation` (gọi `translate-blog` với `workflow_id`)
- Thêm `bulkTranslateWorkflowsMutation`
- Thêm section Workflow vào `UntranslatedSection`
- Thêm `<SelectItem value="workflow">Workflow</SelectItem>` vào entity filter
- Cập nhật query để include `"workflow"` trong `entity_type`
- Cập nhật `getEntityName` và `getOriginalText` cho workflow

#### 4. UntranslatedSection — thêm workflow section (`src/components/admin/translations/UntranslatedSection.tsx`)
- Thêm props: `untranslatedWorkflows`, `onTranslateWorkflow`, `onBulkTranslateWorkflows`, `selectedWorkflowIds`, `onToggleSelectWorkflow`
- Render danh sách workflow chưa dịch tương tự blog

#### 5. TranslationStats — thêm workflow stats (`src/components/admin/translations/TranslationStats.tsx`)
- Thêm props: `workflowPercent`, `translatedWorkflowCount`, `totalWorkflows`
- Hiển thị progress bar cho workflow

#### 6. Mở rộng dịch seo_content + steps (`supabase/functions/translate-blog/index.ts`)
- Ngoài 4 field hiện tại, thêm dịch:
  - `seo_content.problem`, `seo_content.solution`, `seo_content.target_audience`
  - Từng step title/description (lưu thành `step_0_title`, `step_0_description`...)
- Lưu vào bảng translations với field_name pattern: `seo_content_problem`, `step_0_title`, etc.

#### 7. WorkflowDetail — hiển thị dịch steps + seo_content
- Dùng `useTranslatedContent` thêm các field `seo_content_problem`, `seo_content_solution`, `step_0_title`...
- Fallback về nội dung gốc nếu chưa dịch

#### 8. AdminWorkflows EntityTranslationEditor — thêm seo fields
- Thêm fields: `seo_content_problem`, `seo_content_solution`, `seo_content_target_audience` 
- Hiển thị steps dịch (read-only preview)

### Files chỉnh sửa (7 files)

| File | Thay đổi |
|---|---|
| `src/pages/WorkflowDetail.tsx` | Dùng `useTranslatedContent` cho title, description, seo, steps |
| `src/pages/WorkflowsPage.tsx` | Dùng `useTranslatedList` cho listing |
| `src/components/admin/translations/ContentTranslationsTab.tsx` | Fetch workflows, bulk translate, entity filter |
| `src/components/admin/translations/UntranslatedSection.tsx` | Thêm section workflow chưa dịch |
| `src/components/admin/translations/TranslationStats.tsx` | Thêm workflow progress |
| `supabase/functions/translate-blog/index.ts` | Dịch thêm seo_content + steps cho workflow |
| `src/pages/admin/AdminWorkflows.tsx` | Mở rộng fields trong EntityTranslationEditor |

