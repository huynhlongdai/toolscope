import { supabase } from "@/integrations/supabase/client";

export async function fetchTopUsers(limit = 50) {
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, reputation_score, username, created_at")
    .order("reputation_score", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function fetchTopReviewers(limit = 20) {
  const { data } = await supabase
    .from("reviews")
    .select("author_id, profiles:author_id(id, display_name, avatar_url, reputation_score)")
    .eq("status", "published");
  const counts: Record<string, { profile: any; count: number }> = {};
  (data || []).forEach((r: any) => {
    const uid = r.author_id;
    if (!counts[uid]) counts[uid] = { profile: r.profiles, count: 0 };
    counts[uid].count++;
  });
  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function fetchTopCommenters(limit = 20) {
  const { data } = await supabase
    .from("comments")
    .select("user_id, profiles:user_id(id, display_name, avatar_url, reputation_score)");
  const counts: Record<string, { profile: any; count: number }> = {};
  (data || []).forEach((c: any) => {
    const uid = c.user_id;
    if (!counts[uid]) counts[uid] = { profile: c.profiles, count: 0 };
    counts[uid].count++;
  });
  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function fetchAllUserBadges() {
  const { data } = await supabase.from("user_badges").select("user_id, badge_type");
  const map: Record<string, string[]> = {};
  (data || []).forEach((b: any) => {
    if (!map[b.user_id]) map[b.user_id] = [];
    map[b.user_id].push(b.badge_type);
  });
  return map;
}
