-- ============================================================
-- i18n Phase 4: Glossary System + Quality Scoring Enhancement
-- ============================================================

-- 1. Translation Glossary — ensures consistent terminology across locales
CREATE TABLE IF NOT EXISTS translation_glossary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_term text NOT NULL,
  locale text NOT NULL,
  translated_term text NOT NULL,
  context text,                        -- e.g. "UI label", "category name"
  category text DEFAULT 'general',     -- general, brand, technical, ui
  approved boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(source_term, locale)
);

-- Index for fast lookups during translation
CREATE INDEX IF NOT EXISTS idx_glossary_locale ON translation_glossary(locale);
CREATE INDEX IF NOT EXISTS idx_glossary_source ON translation_glossary(source_term);

-- 2. Translation quality log — tracks scoring results per translation
CREATE TABLE IF NOT EXISTS translation_quality_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id uuid,
  entity_type text NOT NULL,           -- tool, blog_post, deal, workflow, system_key
  entity_id uuid,
  locale text NOT NULL,
  field_name text NOT NULL,            -- name, description, content, etc.
  quality_score integer CHECK (quality_score BETWEEN 1 AND 10),
  issues jsonb DEFAULT '[]',           -- [{type: "grammar", detail: "..."}, ...]
  suggestions jsonb DEFAULT '{}',      -- {improved_text: "...", notes: "..."}
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  auto_scored boolean DEFAULT true,    -- true = AI scored, false = human scored
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quality_log_locale ON translation_quality_log(locale);
CREATE INDEX IF NOT EXISTS idx_quality_log_score ON translation_quality_log(quality_score);
CREATE INDEX IF NOT EXISTS idx_quality_log_entity ON translation_quality_log(entity_type, entity_id);

-- 3. Translation stats materialized view for admin dashboard
CREATE OR REPLACE VIEW translation_quality_stats AS
SELECT
  locale,
  entity_type,
  COUNT(*) AS total_scored,
  ROUND(AVG(quality_score), 1) AS avg_score,
  COUNT(*) FILTER (WHERE quality_score >= 8) AS high_quality,
  COUNT(*) FILTER (WHERE quality_score BETWEEN 5 AND 7) AS medium_quality,
  COUNT(*) FILTER (WHERE quality_score < 5) AS low_quality,
  COUNT(*) FILTER (WHERE needs_review IS TRUE) AS pending_review
FROM translation_quality_log tql
LEFT JOIN translations t ON t.id = tql.translation_id
GROUP BY locale, entity_type;

-- 4. Add glossary_applied flag to translations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'translations' AND column_name = 'glossary_applied'
  ) THEN
    ALTER TABLE translations ADD COLUMN glossary_applied boolean DEFAULT false;
  END IF;
END $$;

-- 5. Function to get glossary terms for a locale (used by translate functions)
CREATE OR REPLACE FUNCTION get_glossary_for_locale(p_locale text)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    jsonb_object_agg(source_term, translated_term),
    '{}'::jsonb
  )
  FROM translation_glossary
  WHERE locale = p_locale AND approved = true;
$$;

-- 6. Enable RLS
ALTER TABLE translation_glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_quality_log ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admin full access glossary" ON translation_glossary
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admin full access quality log" ON translation_quality_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

-- Public read for glossary (used during translation)
CREATE POLICY "Public read glossary" ON translation_glossary
  FOR SELECT USING (approved = true);
