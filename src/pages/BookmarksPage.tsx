import { PageLayout } from "@/components/layout/PageLayout";
import { ToolCard } from "@/components/tools/ToolCard";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const BookmarksPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const { data: bookmarks, isLoading } = useQuery({
    queryKey: ["bookmarks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("bookmarks")
        .select("tool_id, tools(*, categories(name), ai_scores(overall_score, is_recommended))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data?.map((b: any) => b.tools).filter(Boolean) || [];
    },
    enabled: !!user,
  });

  if (!user) return <Navigate to="/auth" />;

  return (
    <PageLayout title={t("bookmarks.seoTitle")}>
        <div className="container py-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Bookmark className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t("bookmarks.title")}
            </h1>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : bookmarks?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bookmarks.map((tool: any) => (
                <ToolCard
                  key={tool.id}
                  id={tool.id}
                  name={tool.name}
                  slug={tool.slug}
                  shortDescription={tool.short_description}
                  logoUrl={tool.logo_url}
                  websiteUrl={tool.website_url}
                  pricingType={tool.pricing_type}
                  avgRating={tool.avg_rating || 0}
                  ratingCount={tool.rating_count || 0}
                  categoryName={tool.categories?.name}
                  isTrending={tool.is_trending}
                  isAiRecommended={tool.ai_scores?.is_recommended}
                  aiScore={tool.ai_scores?.overall_score}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Bookmark className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("bookmarks.empty")}</h3>
              <p className="text-muted-foreground">{t("bookmarks.emptyHint")}</p>
            </div>
          )}
        </div>
    </PageLayout>
  );
};

export default BookmarksPage;
