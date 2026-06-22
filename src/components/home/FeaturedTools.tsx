import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ToolCard } from "@/components/tools/ToolCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, Clock, Flame } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

type Tab = "featured" | "trending" | "newest" | "rising";

export function FeaturedTools() {
  const [tab, setTab] = useState<Tab>("featured");
  const { t } = useI18n();

  const { data: tools, isLoading } = useQuery({
    queryKey: ["home-tools", tab],
    queryFn: async () => {
      let query = supabase.from("tools").select("*, categories(name), ai_scores(overall_score, is_recommended)").eq("status", "published").limit(6);
      if (tab === "featured") query = query.eq("is_featured", true).order("avg_rating", { ascending: false });
      else if (tab === "trending") query = query.eq("is_trending", true).order("view_count", { ascending: false });
      else if (tab === "rising") query = query.order("view_count", { ascending: false });
      else query = query.order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "featured", label: "🔥 Hot", icon: <Flame className="h-3.5 w-3.5" /> },
    { key: "trending", label: "⭐ Top Rated", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { key: "newest", label: "🆕 New", icon: <Clock className="h-3.5 w-3.5" /> },
    { key: "rising", label: "🌟 Rising", icon: <Sparkles className="h-3.5 w-3.5" /> },
  ];

  return (
    <section className="py-10 md:py-14">
      <div className="container">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl tracking-tight">
              {t("featured.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("featured.subtitle")}</p>
          </div>
          <div className="flex gap-1 rounded-xl bg-muted/60 p-1 border border-border/40">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
                  tab === tb.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : tools && tools.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <ToolCard key={tool.id} id={tool.id} name={tool.name} slug={tool.slug} shortDescription={tool.short_description || undefined} logoUrl={tool.logo_url || undefined} websiteUrl={tool.website_url || undefined} pricingType={tool.pricing_type} avgRating={Number(tool.avg_rating) || 0} ratingCount={tool.rating_count} categoryName={(tool.categories as any)?.name} isFeatured={tool.is_featured} isTrending={tool.is_trending} isAiRecommended={(tool.ai_scores as any)?.is_recommended} aiScore={(tool.ai_scores as any)?.overall_score ? Number((tool.ai_scores as any).overall_score) : undefined} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">{t("featured.empty")}</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/tools"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {t("featured.viewAll")} →
          </Link>
        </div>
      </div>
    </section>
  );
}
