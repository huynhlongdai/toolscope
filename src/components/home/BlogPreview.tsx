import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";

export function BlogPreview() {
  const { t } = useI18n();
  const { data: posts } = useQuery({
    queryKey: ["home-blog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!posts || posts.length === 0) return null;

  return (
    <section className="py-8 md:py-10" aria-label={t("blog.title")}>
      <div className="container">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold md:text-2xl">{t("blog.title")}</h2>
          <Link to="/blog" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            {t("blog.viewAll")} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} to={`/blog/${post.slug}`}>
              <Card className="h-full overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20">
                {post.cover_image_url && (
                  <div className="aspect-[16/9] overflow-hidden">
                    <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" />
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold line-clamp-2">{post.title}</h3>
                  {post.excerpt && <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>}
                  {post.published_at && (
                    <time className="mt-2 block text-[11px] text-muted-foreground">{format(new Date(post.published_at), "dd/MM/yyyy")}</time>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
