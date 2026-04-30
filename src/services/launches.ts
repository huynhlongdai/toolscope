import { supabase } from "@/integrations/supabase/client";

export async function fetchLaunches(limit = 50) {
  const { data, error } = await supabase
    .from("launches")
    .select("*, profiles:maker_id(display_name, avatar_url), tools(name, slug, logo_url, website_url, short_description, pricing_type)")
    .in("status", ["approved", "featured"])
    .order("launch_date", { ascending: false })
    .order("upvotes", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function fetchLaunchById(id: string) {
  const { data, error } = await supabase
    .from("launches")
    .select("*, profiles:maker_id(display_name, avatar_url, bio), tools(name, slug, logo_url, website_url, short_description, pricing_type)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchUserLaunchVotes(userId: string) {
  const { data } = await supabase
    .from("votes")
    .select("target_id")
    .eq("user_id", userId)
    .eq("target_type", "launch")
    .eq("vote", "up");
  return new Set(data?.map((v) => v.target_id));
}

export async function checkLaunchVote(launchId: string, userId: string) {
  const { data } = await supabase
    .from("votes")
    .select("id")
    .eq("target_id", launchId)
    .eq("target_type", "launch")
    .eq("user_id", userId)
    .eq("vote", "up")
    .maybeSingle();
  return !!data;
}

export async function toggleLaunchVote(launchId: string, userId: string, currentUpvotes: number, hasVoted: boolean) {
  if (hasVoted) {
    await supabase.from("votes").delete().eq("target_id", launchId).eq("target_type", "launch").eq("user_id", userId);
    await supabase.from("launches").update({ upvotes: Math.max(0, currentUpvotes - 1) }).eq("id", launchId);
  } else {
    await supabase.from("votes").insert({ target_id: launchId, target_type: "launch", user_id: userId, vote: "up" as const });
    await supabase.from("launches").update({ upvotes: currentUpvotes + 1 }).eq("id", launchId);
  }
}
