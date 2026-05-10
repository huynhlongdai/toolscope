import { supabase } from "@/integrations/supabase/client";

export async function fetchCompareTools(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("tools")
    .select("*, categories(name), ai_scores(*)")
    .in("id", ids)
    .eq("status", "published");
  if (error) throw error;
  return data ?? [];
}

export async function searchToolsForCompare(query: string, limit = 8) {
  const { data, error } = await supabase
    .from("tools")
    .select("id, name, slug, logo_url, pricing_type, short_description")
    .eq("status", "published")
    .ilike("name", `%${query}%`)
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchPricingHistoryForTools(toolIds: string[]) {
  if (toolIds.length === 0) return [];
  const { data, error } = await supabase
    .from("pricing_history")
    .select("*")
    .in("tool_id", toolIds)
    .order("recorded_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
