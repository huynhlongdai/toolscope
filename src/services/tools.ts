import { supabase } from "@/integrations/supabase/client";

export interface ToolListParams {
  search?: string;
  sortBy?: "popular" | "newest" | "rating" | "name";
  pricingFilter?: string;
  categoryFilter?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchToolBySlug(slug: string) {
  const { data, error } = await supabase
    .from("tools")
    .select("*, categories(name, slug), ai_scores(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchToolsList(params: ToolListParams = {}) {
  const {
    search,
    sortBy = "popular",
    pricingFilter = "all",
    categoryFilter = "all",
    page = 0,
    pageSize = 24,
  } = params;

  let q = supabase
    .from("tools")
    .select("*, categories(name), ai_scores(overall_score, is_recommended)", { count: "exact" })
    .eq("status", "published");

  if (search) q = q.or(`name.ilike.%${search}%,short_description.ilike.%${search}%`);
  if (pricingFilter !== "all") q = q.eq("pricing_type", pricingFilter as any);
  if (categoryFilter !== "all") q = q.eq("category_id", categoryFilter);

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
