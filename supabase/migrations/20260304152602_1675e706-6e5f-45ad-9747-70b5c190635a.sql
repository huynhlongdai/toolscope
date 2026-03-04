ALTER TABLE public.workflows 
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_content jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.workflows.seo_content IS 'JSON containing: problem, solution, common_mistakes, tips, prerequisites, target_audience, estimated_time, difficulty_level, use_cases';