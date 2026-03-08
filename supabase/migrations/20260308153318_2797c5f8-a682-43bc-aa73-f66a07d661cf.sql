
-- Add columns to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.tasks(id),
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS color text;

-- Create task_suggestions table
CREATE TABLE public.task_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.task_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can suggest tasks" ON public.task_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and admins can view suggestions" ON public.task_suggestions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage suggestions" ON public.task_suggestions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
