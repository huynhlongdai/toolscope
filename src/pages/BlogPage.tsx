import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { Link, useSearchParams } from "react-router-dom";
import { Calendar, Eye, User } from "lucide-react";
import { cn } from "@/lib/utils";

type ArticleTypeFilter = "all" | "review" | "listicle" | "case_study" | "comparison" | "howto";

const FILTERS: { value: ArticleTypeFilter; labelKey: string }[] = [
  { value: "all", labelKey: "blog.filterAll" },
  { value: "review", labelKey: "blog.filterReview" },
  { value: "listicle", labelKey: "blog.filterListicle" },
  { value: "case_study", labelKey: "blog.filterCaseStudy" },
  { value: "comparison", labelKey: "blog.filterComparison" },
  { value: "howto", labelKey: "blog.filterHowto" },
];

// Mirrors the inference logic in BlogDetail.tsx so filtering still works
// gracefully before the article_type migration is applied to the live DB.
function inferArticleType(post: any): ArticleTypeFilter {
  const explicit = post?.article_type as string | undefined;
  if (explicit && FILTERS.some((f) => f.value === explicit)) return explicit as ArticleTypeFilter;

  const tags: string[] = (post?.tags as string[]) ?? [];
  const lowerTags = tags.map((t) => t.toLowerCase());
  const title = (post?.title ?? "").toLowerCase();

  if (/\btop\s?\d+\b/.test(title) || lowerTags.some((t) => t.includes("listicle") || t.includes("best-of") || t.includes("top-"))) {
    return "listicle";
  }
  if (/case study/.test(title) || lowerTags.some((t) => t.includes("case-study") || t.includes("case_study"))) {
    return "case_study";
  }
  if (/\bvs\b|comparison/.test(title) || lowerTags.some((t) => t.includes("comparison") || t === "vs")) {
    return "comparison";
  }
  if (/review/.test(title) || lowerTags.some((t) => t.includes("review"))) {
    return "review";
  }
  return "howto";
}

export default function BlogPage() {
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = (searchParams.get("type") as ArticleTypeFilter) || "all";

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, tags, view_count, published_at, author_id, profiles:author_id(display_name, avatar_url)")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data;
    },
  });

  const filteredPosts = useMemo(() => {
    if (!posts) return posts;
    if (activeFilter === "all") return posts;
    return posts.filter((post) => inferArticleType(post) === activeFilter);
  }, [posts, activeFilter]);

  const setFilter = (value: ArticleTypeFilter) => {
    if (value === "all") {
      searchParams.delete("type");
    } else {
      searchParams.set("type", value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <PageLayout title={t("blog.pageTitle")} description={t("blog.pageSubtitle")}>
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {t("blog.pageTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("blog.pageSubtitle")}</p>
        </div>

        {/* Article-type filter tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                activeFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {t(f.labelKey, f.value)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 mb-4" /><Skeleton className="h-6 mb-2" /><Skeleton className="h-4" /></CardContent></Card>
            ))}
          </div>
        ) : filteredPosts && filteredPosts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/30">
                  {post.cover_image_url && (
                    <OptimizedImage
                      src={post.cover_image_url}
                      alt={post.title}
                      wrapperClassName="aspect-video"
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  )}
                  <CardHeader className="pb-2">
                    <div className="mb-1">
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[10px] uppercase tracking-wide">
                        {t(FILTERS.find((f) => f.value === inferArticleType(post))?.labelKey ?? "blog.filterHowto", inferArticleType(post))}
                      </Badge>
                    </div>
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
