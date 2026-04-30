import { supabase } from "@/integrations/supabase/client";

export async function fetchActiveDeals() {
  const { data, error } = await (supabase.from("deals") as any)
    .select("*, tools(name, slug, logo_url)")
    .eq("is_active", true)
    .order("is_exclusive", { ascending: false })
    .order("discount_value", { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((d: any) => !d.expires_at || new Date(d.expires_at) > new Date());
}
