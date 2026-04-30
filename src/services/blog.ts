import { supabase } from "@/integrations/supabase/client";

export async function fetchBlogPosts(limit = 20) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, profiles:author_id(display_name, avatar_url)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function fetchBlogPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*, profiles:author_id(display_name, avatar_url)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}
