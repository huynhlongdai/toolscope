

## Search Analytics & Keyword Intelligence System

### Overview
Build a complete search analytics pipeline: log every user search, aggregate statistics, display reports in admin dashboard, surface popular keywords to end users, and allow admins to create search result rules.

### 1. Database: `search_logs` table

New table to capture every search event:

```sql
CREATE TABLE public.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  normalized_query text NOT NULL,        -- lowercase, trimmed for aggregation
  results_count integer NOT NULL DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,                        -- anonymous tracking
  source text DEFAULT 'hero',             -- hero, tools_page, ai_chat
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: public insert (anon + authenticated), admin-only select
-- Enable realtime for live dashboard
```

### 2. Database: `search_rules` table

Admin-defined rules to pin/boost results for specific keywords:

```sql
CREATE TABLE public.search_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_pattern text NOT NULL,          -- exact match or LIKE pattern
  match_type text NOT NULL DEFAULT 'contains', -- exact, contains, regex
  pinned_tool_ids uuid[] DEFAULT '{}',    -- tools to always show first
  boost_category_id uuid REFERENCES categories(id),
  redirect_url text,                      -- optional redirect
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 3. Edge Function: Log searches (`ai-search/index.ts`)

After AI returns results, insert a row into `search_logs` with `normalized_query`, `results_count`. Also check `search_rules` for matching patterns and apply pinned tools before returning results.

### 4. Admin: Search Analytics Dashboard

New admin page `/admin/search-analytics` (add to sidebar nav):

- **Stat cards**: Total searches (today/week/all), unique keywords, zero-result rate
- **Top Keywords chart**: Bar chart of top 20 most-searched keywords (aggregated from `normalized_query`)
- **Zero-result keywords**: Table of keywords that returned 0 results -- these are content gaps
- **Search trend over time**: Line chart of daily search volume
- **Keyword detail**: Click a keyword to see search count, trend, what results were shown

### 5. Admin: Search Rules Manager

Section within the analytics page or separate tab:
- Table listing all rules (keyword pattern, match type, pinned tools, active status)
- Create/Edit dialog: keyword pattern input, match type select, tool multi-select for pinning, optional redirect URL
- Toggle active/inactive

### 6. Frontend: Dynamic Popular Keywords

Replace the hardcoded `["AI Writing", "Design Tools", ...]` in `HeroSection.tsx` with real data:
- Query `search_logs` grouped by `normalized_query`, ordered by count, limit 8
- Cache with react-query (staleTime: 5min)
- Show as clickable pills with search count badge

### 7. Additional Ideas

- **Search autocomplete**: As user types, suggest from historical popular keywords (debounced query to `search_logs`)
- **"Người khác cũng tìm" (Related searches)**: After showing results, display related keywords that other users searched in the same session
- **Content gap alerts**: Auto-notify admin when a keyword gets 5+ zero-result searches -- signal to add new tools
- **Search-to-conversion tracking**: Track if a search led to a tool click, bookmark, or review (add `clicked_tool_id` to logs or a separate `search_clicks` table)
- **AI keyword clustering**: Periodically run AI to group similar keywords (e.g., "design tool", "công cụ thiết kế", "graphic design app") into clusters for better reporting

### Files to Create/Edit

| File | Action |
|---|---|
| Migration SQL | Create `search_logs` and `search_rules` tables with RLS |
| `supabase/functions/ai-search/index.ts` | Add logging + rules checking |
| `src/pages/admin/AdminSearchAnalytics.tsx` | New admin page with charts and rules manager |
| `src/components/admin/AdminLayout.tsx` | Add nav item for Search Analytics |
| `src/App.tsx` | Add route `/admin/search-analytics` |
| `src/components/home/HeroSection.tsx` | Replace hardcoded tags with dynamic popular keywords |
| `src/hooks/usePopularKeywords.ts` | New hook to fetch popular search terms |

### Implementation Order

1. Create tables via migration
2. Update edge function to log + apply rules
3. Build admin analytics page with charts
4. Build search rules CRUD in admin
5. Replace hardcoded popular keywords with dynamic data
6. Add autocomplete suggestions

