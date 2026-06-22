import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Calendar, Eye, User } from "lucide-react";

export default function BlogPage() {
  const { t, locale } = useI18n();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, tags, view_count, published_at, author_id, profiles:author_id(display_name, avatar_url)")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageLayout title={t("blog.pageTitle")} description={t("blog.pageSubtitle")}>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {t("blog.pageTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("blog.pageSubtitle")}</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 mb-4" /><Skeleton className="h-6 mb-2" /><Skeleton className="h-4" /></CardContent></Card>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/30">
                  {post.cover_image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover transition-transform hover:scale-105" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <h2 className="text-lg font-semibold line-clamp-2">{post.title}</h2>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags?.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {(post.profiles as any)?.display_name || t("reviews.anonymous")}
                      </span>
                      {post.published_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.published_at).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.view_count}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">{t("blog.noPosts")}</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
