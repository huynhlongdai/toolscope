
ALTER TABLE public.launches
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id),
  ADD COLUMN IF NOT EXISTS pricing_type text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS maker_comment text;
