

## Plan nang cap module Tasks

### Hien trang
- **DB**: Bang `tasks` (name, slug, icon, description, sort_order, tool_count) + `tool_tasks` (task_id, tool_id, relevance_score)
- **Public TasksPage**: Grid tasks → click vao → hien thi tools (tu `tool_tasks` hoac fallback search). Khong co search, filter, hay sub-categories
- **AdminTasks**: CRUD tasks, gan tools (don/bulk), AI suggest keyword-matching don gian, reorder

### Nang cap de xuat

#### 1. Database migration — them cot va bang moi

```sql
-- Them cot cho tasks
ALTER TABLE tasks
  ADD COLUMN parent_id uuid REFERENCES tasks(id),
  ADD COLUMN is_featured boolean DEFAULT false,
  ADD COLUMN color text,
  ADD COLUMN tool_count_live integer GENERATED ALWAYS AS (0) STORED; -- se dung trigger thay

-- Bang task_suggestions: user de xuat task moi
CREATE TABLE public.task_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'pending', -- pending/approved/rejected
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.task_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can suggest" ON task_suggestions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own" ON task_suggestions FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage suggestions" ON task_suggestions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
```

#### 2. Public TasksPage — nang cap UX

- **Search bar**: Tim kiem task theo ten (client-side filter)
- **Featured tasks**: Section rieng hien thi tasks co `is_featured = true` o dau trang voi card lon hon
- **Sub-categories**: Hien thi tasks theo parent (group tasks thanh nhom nho neu co `parent_id`)
- **Tool count badge**: Hien thi so tools thuc te tu `tool_tasks` count (query rieng)
- **Sort options**: Phổ biến (tool_count), A-Z, Mới nhất
- **"Suggest a task" button**: User de nghi task moi → insert vao `task_suggestions`
- **Task detail view**: Them filter/sort tools trong task (rating, pricing_type, moi nhat)
- **Share button**: ShareButtons component cho moi task

#### 3. AdminTasks — nang cap admin

- **Stats cards**: Tong tasks, tong tool_tasks mappings, tasks chua co tools, pending suggestions
- **Search & filter**: Tim task theo ten, filter theo is_featured, co/khong tools
- **Featured toggle**: Nhanh chóng bat/tat is_featured ngay trong table
- **Parent task selector**: Gan parent_id khi tao/sua task (dropdown cac tasks khac)
- **Task Suggestions tab**: Xem, approve (tao task tu suggestion), reject de xuat tu user
- **AI Suggest nang cao**: Goi edge function dung Lovable AI model thay vi keyword-matching don gian — phan tich tool description + task name de gan chinh xac hon
- **Merge tasks**: Chon 2 tasks → merge tool_tasks vao 1, xoa task con lai
- **Bulk delete**: Chon nhieu tasks de xoa
- **Export CSV**: Xuat danh sach tasks + tool counts

#### 4. Components moi

- `TaskSuggestDialog.tsx`: Dialog cho user de xuat task moi (public)

### Files thay doi

| File | Thay doi |
|---|---|
| Migration SQL | Them `parent_id`, `is_featured`, `color` vao `tasks`; tao `task_suggestions` |
| `src/pages/TasksPage.tsx` | Search, featured section, sort, suggest button, tool filters |
| `src/pages/admin/AdminTasks.tsx` | Stats, search/filter, featured toggle, suggestions tab, merge, bulk delete, export |
| `src/components/tasks/TaskSuggestDialog.tsx` | **Moi** — user suggest task |

### Thu tu trien khai

1. Migration (cot moi + bang `task_suggestions`)
2. TaskSuggestDialog component
3. TasksPage nang cap (search, featured, sort, suggest)
4. AdminTasks nang cap (stats, suggestions tab, featured toggle, merge, export)

