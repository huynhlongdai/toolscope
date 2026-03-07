
ALTER TABLE public.search_logs ADD COLUMN IF NOT EXISTS matched_tool_ids uuid[] DEFAULT '{}';

ALTER TABLE public.search_rules ADD COLUMN IF NOT EXISTS is_auto boolean DEFAULT false;
ALTER TABLE public.search_rules ADD COLUMN IF NOT EXISTS source_keywords text[] DEFAULT '{}';
