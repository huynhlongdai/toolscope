-- ============================================================
-- i18n Phase 1: Auto-Translate Pipeline
-- Translation queue + DB triggers for auto-translation on publish
-- ============================================================

-- 1. Translation Queue Table
CREATE TABLE IF NOT EXISTS public.translation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,       -- 'tool', 'blog', 'deal', 'workflow', 'category'
  entity_id uuid NOT NULL,
  target_locales text[] DEFAULT ARRAY['vi','zh','ja','ko','th','id','es','fr','pt','de'],
  status text NOT NULL DEFAULT 'pending',  -- pending, processing, completed, partial, failed
  priority int DEFAULT 5,          -- 1=highest, 10=lowest
  attempts int DEFAULT 0,
  error_message text,
  result_summary jsonb,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  triggered_by text DEFAULT 'auto' -- 'auto' (trigger), 'manual' (admin), 'batch' (script)
);

-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_translation_queue_status 
  ON public.translation_queue (status, priority, created_at);

CREATE INDEX IF NOT EXISTS idx_translation_queue_entity 
  ON public.translation_queue (entity_type, entity_id);

-- RLS
ALTER TABLE public.translation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Translation queue viewable by admins" 
  ON public.translation_queue FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Translation queue insert for admins" 
  ON public.translation_queue FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Also allow service role (Edge Functions) to manage queue
-- (service_role bypasses RLS by default)

-- 2. Add quality_score to translations table (for Phase 4 prep)
ALTER TABLE public.translations 
  ADD COLUMN IF NOT EXISTS quality_score smallint,
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;

-- 3. Function to enqueue translation when content is published
CREATE OR REPLACE FUNCTION public.enqueue_auto_translate()
RETURNS trigger AS $$
DECLARE
  _entity_type text;
  _should_translate boolean := false;
BEGIN
  -- Determine entity type from table name
  _entity_type := TG_ARGV[0];
  
  -- Only translate when status changes to 'published' or 'approved'
  -- or when published content is updated
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('published', 'approved', 'active') THEN
      _should_translate := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Translate if just published OR if published content was updated
    IF NEW.status IN ('published', 'approved', 'active') THEN
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Status changed to published
        _should_translate := true;
      ELSIF NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
        -- Content was updated while published
        _should_translate := true;
      END IF;
    END IF;
  END IF;
  
  IF _should_translate THEN
    -- Avoid duplicate pending entries for same entity
    IF NOT EXISTS (
      SELECT 1 FROM public.translation_queue 
      WHERE entity_type = _entity_type 
        AND entity_id = NEW.id 
        AND status IN ('pending', 'processing')
    ) THEN
      INSERT INTO public.translation_queue (entity_type, entity_id, triggered_by)
      VALUES (_entity_type, NEW.id, 'auto');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Triggers for each content table

-- Tools
DROP TRIGGER IF EXISTS auto_translate_tool ON public.tools;
CREATE TRIGGER auto_translate_tool
  AFTER INSERT OR UPDATE ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_auto_translate('tool');

-- Blog posts
DROP TRIGGER IF EXISTS auto_translate_blog ON public.blog_posts;
CREATE TRIGGER auto_translate_blog
  AFTER INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_auto_translate('blog');

-- Deals
DROP TRIGGER IF EXISTS auto_translate_deal ON public.deals;
CREATE TRIGGER auto_translate_deal
  AFTER INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_auto_translate('deal');

-- Workflows
DROP TRIGGER IF EXISTS auto_translate_workflow ON public.workflows;
CREATE TRIGGER auto_translate_workflow
  AFTER INSERT OR UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_auto_translate('workflow');

-- 5. Helper function to manually enqueue batch translation
-- Usage: SELECT batch_enqueue_translations('tool', 50);
CREATE OR REPLACE FUNCTION public.batch_enqueue_translations(
  p_entity_type text,
  p_limit int DEFAULT 100
)
RETURNS int AS $$
DECLARE
  _count int := 0;
  _table_name text;
  _rec record;
BEGIN
  -- Map entity type to table
  _table_name := CASE p_entity_type
    WHEN 'tool' THEN 'tools'
    WHEN 'blog' THEN 'blog_posts'
    WHEN 'deal' THEN 'deals'
    WHEN 'workflow' THEN 'workflows'
    ELSE NULL
  END;
  
  IF _table_name IS NULL THEN
    RAISE EXCEPTION 'Invalid entity_type: %', p_entity_type;
  END IF;
  
  -- Enqueue published entities that don't have pending/processing entries
  FOR _rec IN 
    EXECUTE format(
      'SELECT id FROM public.%I WHERE status IN (''published'', ''approved'', ''active'') ORDER BY created_at DESC LIMIT %s',
      _table_name, p_limit
    )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.translation_queue 
      WHERE entity_type = p_entity_type 
        AND entity_id = _rec.id 
        AND status IN ('pending', 'processing')
    ) THEN
      INSERT INTO public.translation_queue (entity_type, entity_id, triggered_by)
      VALUES (p_entity_type, _rec.id, 'batch');
      _count := _count + 1;
    END IF;
  END LOOP;
  
  RETURN _count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. View for translation coverage stats (for admin dashboard)
CREATE OR REPLACE VIEW public.translation_coverage AS
SELECT 
  t.entity_type,
  t.locale,
  COUNT(DISTINCT t.entity_id) AS translated_entities,
  COUNT(*) AS total_translations,
  COUNT(*) FILTER (WHERE t.is_auto = true) AS auto_translations,
  COUNT(*) FILTER (WHERE t.is_auto = false) AS manual_translations,
  COUNT(*) FILTER (WHERE t.needs_review = true) AS needs_review,
  ROUND(AVG(t.quality_score)::numeric, 1) AS avg_quality_score
FROM public.translations t
GROUP BY t.entity_type, t.locale
ORDER BY t.entity_type, t.locale;

-- Grant access to the view
GRANT SELECT ON public.translation_coverage TO authenticated;
