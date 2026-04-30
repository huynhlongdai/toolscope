import { supabase } from "@/integrations/supabase/client";

export async function fetchProfile(userId: string) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
}

export async function updateProfile(userId: string, fields: { display_name: string; username: string | null; bio: string | null; website: string | null }) {
  const { error } = await supabase.from("profiles").update(fields).eq("id", userId);
  if (error) throw error;
}

export async function fetchUserBadges(userId: string) {
  const { data } = await supabase.from("user_badges").select("*").eq("user_id", userId);
  return data || [];
}

export async function fetchUserReviews(userId: string, limit = 10) {
  const { data } = await supabase
    .from("reviews")
    .select("*, tools(name, slug)")
    .eq("author_id", userId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function fetchUserComments(userId: string, limit = 10) {
  const { data } = await supabase
    .from("comments")
    .select("*, tools:tool_id(name, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function fetchUserStats(userId: string) {
  const [r, c, q] = await Promise.all([
    supabase.from("reviews").select("id", { count: "exact", head: true }).eq("author_id", userId),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return { reviews: r.count || 0, comments: c.count || 0, questions: q.count || 0 };
}

export async function fetchUserWarnings(userId: string) {
  const { data } = await supabase
    .from("user_warnings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function fetchUserBookmarks(userId: string) {
  const { data } = await supabase
    .from("bookmarks")
    .select("tool_id, tools(*, categories(name), ai_scores(overall_score, is_recommended))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data?.map((b: any) => b.tools).filter(Boolean) || [];
}

export async function submitUserReport(reporterId: string, targetId: string, reason: string, details: string | null) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: "user",
    target_id: targetId,
    reason,
    details,
  });
  if (error) throw error;
}
