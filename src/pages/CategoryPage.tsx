import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToolCard } from "@/components/tools/ToolCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { SEOHead } from "@/components/seo/SEOHead";
import { Home } from "lucide-react";
import { G2GridChart } from "@/components/category/G2GridChart";
import { CategoryFilters, type SortOption, type PricingFilter, type ViewMode } from "@/components/category/CategoryFilters";
import { cn } from "@/lib/utils";
import { AdUnit } from "@/components/ads/AdUnit";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const [activeSubCat, setActiveSubCat] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState("");
  const [pricingFilter, setPricingFilter] = useState<PricingFilter>("all");
  const [hasTrialOnly, setHasTrialOnly] = useState(false);
  const [highRatingOnly, setHighRatingOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("slug", slug!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: parentCategory } = useQuery({
    queryKey: ["parent-category", category?.parent_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("name, slug").eq("id", category!.parent_id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!category?.parent_id,
  });

  const { data: subCategories = [] } = useQuery({
    queryKey: ["sub-categories", category?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("parent_id", category!.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!category?.id,
  });

  const categoryIdsToQuery = activeSubCat
    ? [activeSubCat]
    : [category?.id, ...subCategories.map((s) => s.id)].filter(Boolean) as string[];

  const { data: tools, isLoading } = useQuery({
    queryKey: ["category-tools", categoryIdsToQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name), ai_scores(overall_score, is_recommended)")
        .eq("status", "published")
        .in("category_id", categoryIdsToQuery)
        .order("avg_rating", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: categoryIdsToQuery.length > 0,
  });

  // Pricing counts (on unfiltered tools)
  const pricingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tools?.forEach((t) => {
      counts[t.pricing_type] = (counts[t.pricing_type] || 0) + 1;
    });
    return counts;
  }, [tools]);

  // Apply filters + sort
  const filteredTools = useMemo(() => {
    if (!tools) return [];
    let result = [...tools];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.short_description?.toLowerCase().includes(q)
      );
    }
    if (pricingFilter !== "all") {
      result = result.filter((t) => t.pricing_type === pricingFilter);
    }
    if (hasTrialOnly) {
      result = result.filter((t) => (t as any).has_free_trial === true);
    }
    if (highRatingOnly) {
      result = result.filter((t) => Number(t.avg_rating) >= 4);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return Number(b.avg_rating) - Number(a.avg_rating);
        case "ai_score": {
          const sa = (a.ai_scores as any)?.overall_score || 0;
          const sb = (b.ai_scores as any)?.overall_score || 0;
          return Number(sb) - Number(sa);
        }
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "az":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [tools, search, pricingFilter, hasTrialOnly, highRatingOnly, sortBy]);

  const hasActiveFilters = search !== "" || pricingFilter !== "all" || hasTrialOnly || highRatingOnly;

  const clearAllFilters = () => {
    setSearch("");
    setPricingFilter("all");
    setHasTrialOnly(false);
    setHighRatingOnly(false);
    setSortBy("rating");
  };

  const breadcrumbJsonLd = category ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("category.home"), item: window.location.origin + "/" },
      { "@type": "ListItem", position: 2, name: t("category.categories"), item: window.location.origin + "/categories" },
      ...(parentCategory ? [{ "@type": "ListItem", position: 3, name: parentCategory.name, item: window.location.origin + "/category/" + parentCategory.slug }] : []),
      { "@type": "ListItem", position: parentCategory ? 4 : 3, name: category.name },
    ],
  } : null;

  return (
    <div className="flex min-h-screen flex-col">
      {category && (
        <SEOHead
          title={`${category.name} — ${t("tools.title")} | ToolScope`}
          description={category.description || `${t("categories.title")} ${category.name}`}
        />
      )}
      {breadcrumbJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      )}
      <Header />
      <main className="flex-1">
        <div className="container py-8">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center gap-1">
                    <Home className="h-3.5 w-3.5" />
                    {t("category.home")}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/categories">{t("category.categories")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {parentCategory && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={`/category/${parentCategory.slug}`}>{parentCategory.name}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{category?.name || "..."}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mb-6">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {category?.name || t("common.loading")}
            </h1>
            {category?.description && (
              <p className="mt-2 text-muted-foreground">{category.description}</p>
            )}
          </div>

          {subCategories.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveSubCat(null)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  !activeSubCat
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                {t("category.all")}
              </button>
              {subCategories.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubCat(sub.id === activeSubCat ? null : sub.id)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    activeSubCat === sub.id
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}

          {tools && tools.length >= 3 && category && (
            <G2GridChart tools={tools as any} categoryName={category.name} />
          )}

          {/* Filters */}
          <CategoryFilters
            search={search}
            onSearchChange={setSearch}
            pricingFilter={pricingFilter}
            onPricingChange={setPricingFilter}
            hasTrialOnly={hasTrialOnly}
            onTrialChange={setHasTrialOnly}
            highRatingOnly={highRatingOnly}
            onHighRatingChange={setHighRatingOnly}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filteredCount={filteredTools.length}
            totalCount={tools?.length || 0}
            pricingCounts={pricingCounts}
            onClearAll={clearAllFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : filteredTools.length > 0 ? (
            <>
              <AdUnit slotId="between_tools" className="mb-4" />
              <div className={cn(
                viewMode === "grid"
                  ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                  : "flex flex-col gap-2"
              )}>
                {filteredTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    id={tool.id}
                    name={tool.name}
                    slug={tool.slug}
                    shortDescription={tool.short_description || undefined}
                    logoUrl={tool.logo_url || undefined}
                    websiteUrl={tool.website_url || undefined}
                    pricingType={tool.pricing_type}
                    avgRating={Number(tool.avg_rating) || 0}
                    ratingCount={tool.rating_count}
                    categoryName={(tool.categories as any)?.name}
                    isTrending={tool.is_trending}
                    isAiRecommended={(tool.ai_scores as any)?.is_recommended}
                    aiScore={(tool.ai_scores as any)?.overall_score ? Number((tool.ai_scores as any).overall_score) : undefined}
                    variant={viewMode}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
              <p className="text-muted-foreground">
                {hasActiveFilters ? "Không tìm thấy tool phù hợp. Thử thay đổi bộ lọc." : t("category.noTools")}
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
