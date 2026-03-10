import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SCHEMA_SQL = `
-- Enums
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'editor', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.content_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.pricing_type AS ENUM ('free', 'freemium', 'paid', 'subscription', 'one_time', 'contact', 'open_source');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  username text,
  avatar_url text,
  bio text,
  website text,
  reputation_score integer NOT NULL DEFAULT 0,
  is_banned boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  parent_id uuid REFERENCES public.categories(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- tools
CREATE TABLE IF NOT EXISTS public.tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  short_description text,
  logo_url text,
  website_url text,
  category_id uuid REFERENCES public.categories(id),
  pricing_type public.pricing_type DEFAULT 'free',
  is_verified boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  is_trending boolean DEFAULT false,
  is_new boolean DEFAULT false,
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  average_rating numeric DEFAULT 0,
  features text[] DEFAULT '{}',
  screenshots text[] DEFAULT '{}',
  video_url text,
  affiliate_url text,
  trial_days integer,
  has_free_trial boolean DEFAULT false,
  has_api boolean DEFAULT false,
  supported_platforms text[] DEFAULT '{}',
  seo_title text,
  seo_description text,
  seo_keywords text[] DEFAULT '{}',
  detailed_article text,
  pricing_plans jsonb DEFAULT '[]',
  submitted_by uuid,
  status public.content_status DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- tags
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- tool_tags
CREATE TABLE IF NOT EXISTS public.tool_tags (
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (tool_id, tag_id)
);

-- reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  content text NOT NULL,
  pros text,
  cons text,
  use_case text,
  ease_of_use smallint,
  value_for_money smallint,
  customer_support smallint,
  likelihood_to_recommend smallint,
  is_editor_review boolean NOT NULL DEFAULT false,
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- blog_posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL,
  excerpt text,
  cover_image_url text,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  status public.content_status NOT NULL DEFAULT 'draft',
  tags text[] DEFAULT '{}',
  seo_title text,
  seo_description text,
  seo_keywords text[] DEFAULT '{}',
  related_tool_ids uuid[] DEFAULT '{}',
  view_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- site_settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- menus
CREATE TABLE IF NOT EXISTS public.menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- pages
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  blocks jsonb NOT NULL DEFAULT '[]',
  template text DEFAULT 'blank',
  status public.content_status DEFAULT 'draft',
  seo_title text,
  seo_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- deals
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  coupon_code text,
  discount_type text DEFAULT 'percentage',
  discount_value numeric,
  original_price numeric,
  deal_price numeric,
  currency text DEFAULT 'USD',
  deal_url text,
  starts_at timestamptz,
  expires_at timestamptz,
  is_verified boolean DEFAULT false,
  is_exclusive boolean DEFAULT false,
  is_active boolean DEFAULT true,
  click_count integer DEFAULT 0,
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  color text,
  parent_id uuid REFERENCES public.tasks(id),
  sort_order integer DEFAULT 0,
  tool_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- collections
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  cover_image_url text,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  is_public boolean NOT NULL DEFAULT true,
  upvotes integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- collection_items
CREATE TABLE IF NOT EXISTS public.collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  tool_id uuid NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now()
);

-- launches
CREATE TABLE IF NOT EXISTS public.launches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tagline text NOT NULL,
  description text,
  product_name text,
  logo_url text,
  website_url text,
  video_url text,
  trial_url text,
  screenshots text[] DEFAULT '{}',
  features text[] DEFAULT '{}',
  pricing_type text DEFAULT 'free',
  maker_id uuid NOT NULL REFERENCES public.profiles(id),
  maker_comment text,
  tool_id uuid REFERENCES public.tools(id),
  category_id uuid REFERENCES public.categories(id),
  status text NOT NULL DEFAULT 'pending',
  launch_date date NOT NULL DEFAULT CURRENT_DATE,
  scheduled_at timestamptz,
  is_coming_soon boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  subscriber_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- follows
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL,
  target_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  metadata jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- sync_logs
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL,
  tables_synced text[] NOT NULL DEFAULT '{}',
  rows_pushed integer DEFAULT 0,
  rows_pulled integer DEFAULT 0,
  conflicts integer DEFAULT 0,
  status text DEFAULT 'running',
  error_message text,
  created_by uuid,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
`;

// List of tables we expect to exist after setup
const EXPECTED_TABLES = [
  "profiles", "categories", "tools", "tags", "tool_tags", "reviews",
  "blog_posts", "site_settings", "menus", "pages", "deals", "tasks",
  "collections", "collection_items", "launches", "follows",
  "notifications", "user_roles", "sync_logs",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const localUrl = Deno.env.get("SUPABASE_URL")!;
    const localServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dbUrl = Deno.env.get("EXTERNAL_SUPABASE_DB_URL");

    if (!dbUrl) {
      return new Response(
        JSON.stringify({ error: "EXTERNAL_SUPABASE_DB_URL chưa được cấu hình. Vui lòng thêm connection string của database bên ngoài." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin
    const localClient = createClient(localUrl, localServiceKey, { auth: { persistSession: false } });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await localClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await localClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Connect to external database using Deno's built-in postgres
    const { Client } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
    const client = new Client(dbUrl);
    await client.connect();

    const results: { table: string; status: string }[] = [];
    const errors: string[] = [];

    try {
      // Execute the entire schema SQL
      await client.queryArray(SCHEMA_SQL);

      // Verify which tables exist
      const { rows } = await client.queryArray(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)`,
        [EXPECTED_TABLES]
      );
      const existingTables = new Set(rows.map((r: any) => r[0]));

      for (const table of EXPECTED_TABLES) {
        if (existingTables.has(table)) {
          results.push({ table, status: "ok" });
        } else {
          results.push({ table, status: "missing" });
          errors.push(`Table ${table} was not created`);
        }
      }
    } catch (err) {
      errors.push(err.message);
    } finally {
      await client.end();
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        tables: results,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
