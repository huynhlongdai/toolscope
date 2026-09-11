import { supabase } from "@/integrations/supabase/client";

export interface ToolListParams {
  search?: string;
  sortBy?: "popular" | "newest" | "rating" | "name";
  pricingFilter?: string;
  /** @deprecated use categoryFilters (multi-select) instead */
  categoryFilter?: string;
  categoryFilters?: string[];
  freeTrialOnly?: boolean;
  minAiScore?: number;
  page?: number;
  pageSize?: number;
}

/**
 * `skipStatusFilter` is used by the Preview feature: admin/editor accounts
 * are granted RLS SELECT on non-published tools (see the original SELECT
 * policy - it already included admin/editor, unlike pages/workflows/deals
 * which needed a new migration), so ToolDetail.tsx can skip the
 * `.eq("status","published")` filter for those roles and show a real
 * preview of a draft/pending_review tool at its normal public URL.
 */
export async function fetchToolBySlug(slug: string, skipStatusFilter = false) {
  let q = supabase
    .from("tools")
    .select("*, categories(name, slug), ai_scores(*)")
    .eq("slug", slug);
  if (!skipStatusFilter) q = q.eq("status", "published");
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchToolsList(params: ToolListParams = {}) {
  const {
    search,
    sortBy = "popular",
    pricingFilter = "all",
    categoryFilter = "all",
    categoryFilters,
    freeTrialOnly = false,
    minAiScore = 0,
    page = 0,
    pageSize = 24,
  } = params;

  // Filtering by a joined table's column (ai_scores.overall_score) requires
  // an inner join in supabase-js (`ai_scores!inner(...)`) — but that would
  // silently exclude tools that have no ai_scores row at all when the
  // filter is inactive (minAiScore = 0). So only switch to !inner when the
  // user actually set a minimum score.
  const aiScoresSelect = minAiScore > 0 ? "ai_scores!inner(overall_score, is_recommended)" : "ai_scores(overall_score, is_recommended)";

  let q = supabase
    .from("tools")
    .select(`*, categories(name), ${aiScoresSelect}`, { count: "exact" })
    .eq("status", "published");

  if (search) q = q.or(`name.ilike.%${search}%,short_description.ilike.%${search}%`);
  if (pricingFilter !== "all") q = q.eq("pricing_type", pricingFilter as any);

  // Multi-select category takes precedence; fall back to legacy single-value
  // categoryFilter for any older callers.
  if (categoryFilters && categoryFilters.length > 0) {
    q = q.in("category_id", categoryFilters);
  } else if (categoryFilter !== "all") {
    q = q.eq("category_id", categoryFilter);
  }

  if (freeTrialOnly) q = q.eq("has_free_trial", true);
  if (minAiScore > 0) q = q.gte("ai_scores.overall_score", minAiScore);

  if (sortBy === "popular") q = q.order("view_count", { ascending: false });
  else if (sortBy === "newest") q = q.order("created_at", { ascending: false });
  else if (sortBy === "rating") q = q.order("avg_rating", { ascending: false });
  else q = q.order("name");

  const { data, error, count } = await q.range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function fetchToolReviews(toolId: string, limit = 10) {
  const { data, error } = await supabase
    .from("reviews")
    .select("*, profiles:author_id(display_name, avatar_url)")
    .eq("tool_id", toolId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function checkBookmark(toolId: string, userId: string) {
  const { data } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("tool_id", toolId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function toggleBookmark(toolId: string, userId: string, isCurrentlyBookmarked: boolean) {
  if (isCurrentlyBookmarked) {
    await supabase.from("bookmarks").delete().eq("tool_id", toolId).eq("user_id", userId);
  } else {
    await supabase.from("bookmarks").insert({ tool_id: toolId, user_id: userId });
  }
}

export async function upsertRating(toolId: string, userId: string, score: number) {
  const { error } = await supabase
    .from("ratings")
    .upsert({ tool_id: toolId, user_id: userId, score }, { onConflict: "tool_id,user_id" });
  if (error) throw error;
}

export async function fetchUserRating(toolId: string, userId: string): Promise<number> {
  const { data } = await supabase
    .from("ratings")
    .select("score")
    .eq("tool_id", toolId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.score ?? 0;
}

export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  if (error) throw error;
  return data;
}
