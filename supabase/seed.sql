-- Local development seed data for ToolScope
-- Safe to re-run (idempotent via fixed UUIDs + ON CONFLICT)

-- 1. Admin auth user + profile + role -----------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'admin@toolscope.local',
  crypt('admin123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}', false, false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, username, display_name, bio)
VALUES ('11111111-1111-1111-1111-111111111111', 'toolscope_editor', 'ToolScope Editorial', 'Editorial team behind ToolScope reviews and guides.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Categories ------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, description, icon, sort_order) VALUES
  ('c1111111-0000-0000-0000-000000000001', 'AI Writing', 'ai-writing', 'AI-powered writing and content generation tools', '✍️', 1),
  ('c1111111-0000-0000-0000-000000000002', 'AI Design', 'ai-design', 'AI design and image generation tools', '🎨', 2),
  ('c1111111-0000-0000-0000-000000000003', 'Developer Tools', 'developer-tools', 'AI coding assistants and dev productivity tools', '💻', 3),
  ('c1111111-0000-0000-0000-000000000004', 'Productivity', 'productivity', 'AI productivity and automation tools', '⚡', 4)
ON CONFLICT (id) DO NOTHING;

-- 3. Tools -----------------------------------------------------------------
INSERT INTO public.tools (
  id, name, slug, description, short_description, logo_url, website_url,
  pricing_type, category_id, status, avg_rating, rating_count,
  is_featured, is_trending, affiliate_url, has_free_trial, trial_days
) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Jasper AI', 'jasper-ai',
   'Jasper is an AI writing assistant built for marketing teams, offering brand-voice-aware long-form content, campaigns, and templates.',
   'AI writing assistant for marketing teams',
   'https://www.jasper.ai/favicon.ico', 'https://www.jasper.ai',
   'paid', 'c1111111-0000-0000-0000-000000000001', 'published', 4.5, 128,
   true, true, 'https://www.jasper.ai?ref=toolscope', true, 7),
  ('a0000000-0000-0000-0000-000000000002', 'Copy.ai', 'copy-ai',
   'Copy.ai helps teams generate marketing copy, blog outlines, and social posts using generative AI workflows.',
   'AI copywriting and workflow automation',
   'https://www.copy.ai/favicon.ico', 'https://www.copy.ai',
   'freemium', 'c1111111-0000-0000-0000-000000000001', 'published', 4.2, 96,
   true, false, 'https://www.copy.ai?ref=toolscope', true, 7),
  ('a0000000-0000-0000-0000-000000000003', 'Writesonic', 'writesonic',
   'Writesonic is an AI content suite for SEO articles, ads, and landing pages with a fast bulk-generation mode.',
   'AI SEO content generator',
   'https://writesonic.com/favicon.ico', 'https://writesonic.com',
   'freemium', 'c1111111-0000-0000-0000-000000000001', 'published', 4.0, 74,
   false, true, 'https://writesonic.com?ref=toolscope', true, 5),
  ('a0000000-0000-0000-0000-000000000004', 'Midjourney', 'midjourney',
   'Midjourney is a leading AI image generator known for artistic, high-fidelity outputs via Discord and web app.',
   'AI image generation via text prompts',
   'https://www.midjourney.com/favicon.ico', 'https://www.midjourney.com',
   'paid', 'c1111111-0000-0000-0000-000000000002', 'published', 4.7, 210,
   true, true, 'https://www.midjourney.com?ref=toolscope', false, null),
  ('a0000000-0000-0000-0000-000000000005', 'GitHub Copilot', 'github-copilot',
   'GitHub Copilot is an AI pair programmer that suggests code and entire functions in real time inside your editor.',
   'AI pair programmer for code completion',
   'https://github.com/favicon.ico', 'https://github.com/features/copilot',
   'paid', 'c1111111-0000-0000-0000-000000000003', 'published', 4.6, 340,
   true, true, 'https://github.com/features/copilot?ref=toolscope', true, 30),
  ('a0000000-0000-0000-0000-000000000006', 'Cursor', 'cursor',
   'Cursor is an AI-first code editor built on VS Code, with deep codebase-aware chat and multi-file edits.',
   'AI-first code editor',
   'https://www.cursor.com/favicon.ico', 'https://www.cursor.com',
   'freemium', 'c1111111-0000-0000-0000-000000000003', 'published', 4.8, 180,
   true, true, 'https://www.cursor.com?ref=toolscope', true, 14),
  ('a0000000-0000-0000-0000-000000000007', 'Notion AI', 'notion-ai',
   'Notion AI adds writing, summarization, and Q&A capabilities directly inside Notion workspaces.',
   'AI writing and knowledge assistant in Notion',
   'https://www.notion.so/favicon.ico', 'https://www.notion.so',
   'freemium', 'c1111111-0000-0000-0000-000000000004', 'published', 4.3, 150,
   false, false, 'https://www.notion.so?ref=toolscope', true, 7),
  ('a0000000-0000-0000-0000-000000000008', 'Zapier', 'zapier',
   'Zapier connects thousands of apps with no-code automation workflows, now enhanced with AI-powered steps.',
   'No-code automation between apps',
   'https://zapier.com/favicon.ico', 'https://zapier.com',
   'freemium', 'c1111111-0000-0000-0000-000000000004', 'published', 4.4, 260,
   false, false, 'https://zapier.com?ref=toolscope', true, 14)
ON CONFLICT (id) DO NOTHING;

-- 4. Blog posts --------------------------------------------------------------

-- 4a. Review article (Jasper AI)
INSERT INTO public.blog_posts (
  id, title, slug, excerpt, content, cover_image_url, author_id, status,
  tags, related_tool_ids, published_at,
  article_type, primary_tool_id, cta_label, has_affiliate_links,
  verdict_rating, verdict_summary, verdict_pros, verdict_cons, verdict_best_for
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Jasper AI Review 2026: Is It Still Worth It?',
  'jasper-ai-review-2026',
  'We tested Jasper AI for a month across blog posts, ads, and social captions. Here is our honest verdict.',
  E'## Overview\n\nJasper AI has been one of the most recognizable names in AI writing since 2021. In this review we cover pricing, brand voice features, output quality, and where it falls short.\n\n## Content Quality\n\nJasper produces consistently on-brand long-form content once you train its Brand Voice feature with a few sample documents. Short-form copy (ads, captions) is where it truly shines.\n\n## Pricing\n\nStarting at $49/month for the Creator plan, Jasper sits at the premium end of the AI writing market.\n\n## Final Thoughts\n\nIf you run a marketing team that needs consistent brand voice at scale, Jasper remains a strong pick in 2026.',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200',
  '11111111-1111-1111-1111-111111111111',
  'published',
  ARRAY['ai-writing','review','marketing'],
  ARRAY['a0000000-0000-0000-0000-000000000002']::uuid[],
  now() - interval '2 days',
  'review', 'a0000000-0000-0000-0000-000000000001', 'Try Jasper AI Free', true,
  4.5, 'Jasper AI remains the most polished brand-voice-aware writing assistant for marketing teams, though its price puts it out of reach for solo creators.',
  ARRAY['Excellent brand voice consistency','Huge template library','Strong team collaboration features'],
  ARRAY['Expensive for solo users','Learning curve for advanced workflows'],
  'Marketing teams that need consistent brand voice at scale'
) ON CONFLICT (id) DO NOTHING;

-- 4b. Listicle article (Top AI writing tools)
INSERT INTO public.blog_posts (
  id, title, slug, excerpt, content, cover_image_url, author_id, status,
  tags, related_tool_ids, published_at,
  article_type, cta_label, has_affiliate_links, listicle_items
) VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'Top 5 AI Writing Tools for Content Teams in 2026',
  'top-5-ai-writing-tools-2026',
  'From long-form blog drafts to ad copy, here are the 5 best AI writing tools we tested this year, ranked.',
  E'## How We Tested\n\nWe evaluated each tool on output quality, pricing, ease of use, and team collaboration features over a 3-week trial period.\n\n## The Ranking\n\nSee the ranked list below for our top picks, with pros, cons and pricing for each.\n\n## Conclusion\n\nJasper AI takes the top spot for teams, while Writesonic remains the best budget pick for solo creators.',
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200',
  '11111111-1111-1111-1111-111111111111',
  'published',
  ARRAY['ai-writing','listicle','top-tools'],
  ARRAY['a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003']::uuid[],
  now() - interval '5 days',
  'listicle', 'Compare Plans', true,
  '[
    {"rank":1,"tool_id":"a0000000-0000-0000-0000-000000000001","badge":"Editor''s Choice","highlight":"Best for brand-consistent marketing teams","pros":["Best-in-class brand voice","Huge template library"],"cons":["Pricier than competitors"],"ctaLabel":"Try Jasper Free"},
    {"rank":2,"tool_id":"a0000000-0000-0000-0000-000000000002","badge":"Best Value","highlight":"Great free tier and workflow automation","pros":["Generous free plan","Easy workflow builder"],"cons":["Occasional generic output"],"ctaLabel":"Try Copy.ai Free"},
    {"rank":3,"tool_id":"a0000000-0000-0000-0000-000000000003","badge":"Best for SEO","highlight":"Fast bulk SEO article generation","pros":["Fast bulk mode","Built-in SEO checker"],"cons":["Quality dips on long articles"],"ctaLabel":"Try Writesonic"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 4c. Case study article (Cursor + Copilot workflow)
INSERT INTO public.blog_posts (
  id, title, slug, excerpt, content, cover_image_url, author_id, status,
  tags, related_tool_ids, published_at,
  article_type, has_affiliate_links, case_study_stats, case_study_tools_used
) VALUES (
  'b0000000-0000-0000-0000-000000000003',
  'How a 3-Person Startup Shipped an MVP in 10 Days Using AI Coding Tools',
  'startup-mvp-10-days-ai-coding-tools',
  'A small startup team combined Cursor, GitHub Copilot, and Zapier to go from idea to launched MVP in just 10 days.',
  E'## The Challenge\n\nA 3-person startup team needed to validate a SaaS idea fast, with no dedicated backend engineer.\n\n## The Approach\n\nUsing Cursor for AI-assisted full-stack development and GitHub Copilot for in-editor completions, the team built the core product in under two weeks. Zapier automated onboarding emails and Slack notifications.\n\n## The Results\n\nThe team shipped a working MVP with paying beta users within 10 days, spending roughly 70% less time on boilerplate code compared to their previous project.\n\n## Key Takeaways\n\nAI coding tools do not replace engineering judgement, but they dramatically compress the time from idea to working software when used deliberately.',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200',
  '11111111-1111-1111-1111-111111111111',
  'published',
  ARRAY['case-study','developer-tools','startup'],
  ARRAY['a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000008']::uuid[],
  now() - interval '1 day',
  'case_study', true,
  '[
    {"label":"Time to MVP","value":"10 days","icon":"clock"},
    {"label":"Faster Development","value":"70%","icon":"trending"},
    {"label":"Dev Cost Saved","value":"$18,000","icon":"dollar"},
    {"label":"Beta Users","value":"120+","icon":"users"}
  ]'::jsonb,
  '[
    {"role":"AI-first code editor for full-stack development","tool_id":"a0000000-0000-0000-0000-000000000006"},
    {"role":"In-editor AI code completion","tool_id":"a0000000-0000-0000-0000-000000000005"},
    {"role":"Automated onboarding emails and Slack alerts","tool_id":"a0000000-0000-0000-0000-000000000008"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 4d. Comparison article
INSERT INTO public.blog_posts (
  id, title, slug, excerpt, content, cover_image_url, author_id, status,
  tags, related_tool_ids, published_at,
  article_type, has_affiliate_links
) VALUES (
  'b0000000-0000-0000-0000-000000000004',
  'Cursor vs GitHub Copilot: Which AI Coding Assistant Wins in 2026?',
  'cursor-vs-github-copilot-2026',
  'We compare Cursor and GitHub Copilot head-to-head on code quality, pricing, and workflow integration.',
  E'## Overview\n\nBoth Cursor and GitHub Copilot are leading AI coding assistants, but they take different approaches: Cursor is a full editor, Copilot is a plugin.\n\n## Code Quality\n\nCursor''s multi-file, codebase-aware chat tends to produce more contextually accurate suggestions for larger refactors, while Copilot excels at fast inline completions.\n\n## Pricing\n\nCopilot starts at $10/month for individuals, while Cursor''s Pro plan is $20/month but bundles a full editor experience.\n\n## Verdict\n\nChoose Cursor if you want an AI-native editor experience; choose Copilot if you want to keep your existing VS Code/JetBrains setup.',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200',
  '11111111-1111-1111-1111-111111111111',
  'published',
  ARRAY['comparison','developer-tools'],
  ARRAY['a0000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000006']::uuid[],
  now() - interval '3 days',
  'comparison', true
) ON CONFLICT (id) DO NOTHING;

-- 4e. How-to article
INSERT INTO public.blog_posts (
  id, title, slug, excerpt, content, cover_image_url, author_id, status,
  tags, related_tool_ids, published_at,
  article_type, has_affiliate_links
) VALUES (
  'b0000000-0000-0000-0000-000000000005',
  'How to Automate Your Content Workflow with AI in 5 Steps',
  'automate-content-workflow-ai-5-steps',
  'A step-by-step guide to building an AI-powered content pipeline from brief to publish.',
  E'## Step 1: Define Your Brief Template\n\nStart with a consistent brief template covering audience, keywords, and tone.\n\n## Step 2: Generate a Draft\n\nUse an AI writing tool to generate a first draft from your brief.\n\n## Step 3: Human Edit Pass\n\nAlways have a human editor review tone, accuracy, and brand voice.\n\n## Step 4: Automate Distribution\n\nUse automation tools to push published content to your CMS and social channels.\n\n## Step 5: Track Performance\n\nMonitor engagement and iterate on your brief template based on what performs best.',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200',
  '11111111-1111-1111-1111-111111111111',
  'published',
  ARRAY['howto','productivity','ai-writing'],
  ARRAY['a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000008']::uuid[],
  now() - interval '7 days',
  'howto', false
) ON CONFLICT (id) DO NOTHING;
