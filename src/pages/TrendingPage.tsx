import { PageLayout } from "@/components/layout/PageLayout";
import { useI18n } from "@/lib/i18n";
import { ToolCard } from "@/components/tools/ToolCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Flame, Star, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TrendingPage = () => {
  const { t } = useI18n();

  const { data: trendingTools, isLoading: loadingTrending } = useQuery({
    queryKey: ["trending-tools"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tools")
        .select("*, categories(name), ai_scores(overall_score, is_recommended)")
        .eq("status", "published")
        .eq("is_trending", true)
        .order("view_count", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: risingStars, isLoading: loadingRising } = useQuery({
    queryKey: ["rising-stars"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase
        .from("tools")
        .select("*, categories(name), ai_scores(overall_score, is_recommended)")
        .eq("status", "published")
        .gte("created_at", thirtyDaysAgo)
        .order("view_count", { ascending: false })
        .limit(12);
      return data || [];
    },
  });

  const { data: topRated, isLoading: loadingTopRated } = useQuery({
    queryKey: ["top-rated-tools"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tools")
        .select("*, categories(name), ai_scores(overall_score, is_recommended)")
        .eq("status", "published")
        .gt("rating_count", 0)
        .order("avg_rating", { ascending: false })
        .limit(12);
      return data || [];
    },
  });

  const renderTools = (tools: any[] | undefined, loading: boolean) => {
    if (loading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      );
    }
    if (!tools?.length) {
      return <p className="text-muted-foreground text-center py-12">{t("trending.noData")}</p>;
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool: any) => (
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
    );
  };

  return (
    <PageLayout title={`${t("trending.title")} - ToolScope`} description={t("trending.subtitle")}>
        <div className="container py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t("trending.title")}
              </h1>
            </div>
            <p className="text-muted-foreground">{t("trending.subtitle")}</p>
          </div>

          <Tabs defaultValue="trending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="trending" className="gap-1.5">
                <Flame className="h-4 w-4" /> {t("trending.hot")}
              </TabsTrigger>
              <TabsTrigger value="rising" className="gap-1.5">
                <Sparkles className="h-4 w-4" /> {t("trending.risingStars")}
              </TabsTrigger>
              <TabsTrigger value="top-rated" className="gap-1.5">
                <Star className="h-4 w-4" /> {t("trending.topRated")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trending">
              {renderTools(trendingTools, loadingTrending)}
            </TabsContent>
            <TabsContent value="rising">
              {renderTools(risingStars, loadingRising)}
            </TabsContent>
            <TabsContent value="top-rated">
              {renderTools(topRated, loadingTopRated)}
            </TabsContent>
          </Tabs>
        </div>
    </PageLayout>
  );
};

export default TrendingPage;
