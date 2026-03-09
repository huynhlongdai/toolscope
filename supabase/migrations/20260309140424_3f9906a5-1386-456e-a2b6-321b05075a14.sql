ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT NULL;
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS requires_card boolean DEFAULT NULL;
ALTER TABLE public.tools ADD COLUMN IF NOT EXISTS signup_options text[] DEFAULT '{}';