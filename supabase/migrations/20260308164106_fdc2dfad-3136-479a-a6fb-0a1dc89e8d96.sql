
-- Add admin_note to reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_note text;

-- Create user_warnings table
CREATE TABLE public.user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  warned_by uuid NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage warnings" ON user_warnings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users view own warnings" ON user_warnings FOR SELECT TO authenticated USING (auth.uid() = user_id);
