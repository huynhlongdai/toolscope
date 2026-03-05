
-- Tasks table for task-based discovery
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text DEFAULT '🔧',
  sort_order integer DEFAULT 0,
  tool_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks viewable by everyone" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Mapping table: which tools solve which tasks
CREATE TABLE public.tool_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  relevance_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tool_id, task_id)
);

ALTER TABLE public.tool_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tool tasks viewable by everyone" ON public.tool_tasks FOR SELECT USING (true);
CREATE POLICY "Admins can manage tool tasks" ON public.tool_tasks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Product launches table
CREATE TABLE public.launches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid REFERENCES public.tools(id) ON DELETE SET NULL,
  maker_id uuid NOT NULL REFERENCES public.profiles(id),
  tagline text NOT NULL,
  description text,
  launch_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','featured')),
  upvotes integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  screenshots text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.launches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved launches viewable" ON public.launches FOR SELECT USING (status IN ('approved','featured') OR maker_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can submit launches" ON public.launches FOR INSERT WITH CHECK (auth.uid() = maker_id);
CREATE POLICY "Users can update own launches" ON public.launches FOR UPDATE USING (auth.uid() = maker_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete launches" ON public.launches FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed some common tasks
INSERT INTO public.tasks (name, slug, icon, description, sort_order) VALUES
  ('Tạo hình ảnh AI', 'generate-images', '🎨', 'Tạo hình ảnh, minh họa, thiết kế bằng AI', 1),
  ('Viết nội dung', 'write-content', '✍️', 'Tạo bài viết, blog, copy marketing', 2),
  ('Chỉnh sửa video', 'edit-video', '🎬', 'Cắt ghép, chỉnh sửa và tạo video', 3),
  ('Tạo website', 'build-website', '🌐', 'Xây dựng trang web không cần code', 4),
  ('Phân tích dữ liệu', 'analyze-data', '📊', 'Xử lý, phân tích và trực quan hóa dữ liệu', 5),
  ('Quản lý dự án', 'manage-projects', '📋', 'Theo dõi tiến độ, phân công công việc', 6),
  ('Tạo chatbot', 'create-chatbot', '🤖', 'Xây dựng chatbot và trợ lý AI', 7),
  ('Thiết kế đồ họa', 'design-graphics', '🎯', 'Tạo logo, banner, social media graphics', 8),
  ('Chuyển đổi giọng nói', 'text-to-speech', '🔊', 'Chuyển văn bản thành giọng nói tự nhiên', 9),
  ('Dịch thuật', 'translate', '🌍', 'Dịch nội dung đa ngôn ngữ', 10),
  ('Tự động hóa', 'automate-tasks', '⚡', 'Tự động hóa quy trình làm việc', 11),
  ('Email Marketing', 'email-marketing', '📧', 'Tạo chiến dịch email tự động', 12);
