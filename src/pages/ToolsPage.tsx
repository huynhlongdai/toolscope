import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { fetchCategories, fetchToolsList } from "@/services/tools";
import { useDebounce } from "@/hooks/useDebounce";
import { PageLayout } from "@/components/layout/PageLayout";
import { ToolCard } from "@/components/tools/ToolCard";
import { ToolCardSkeletonGrid } from "@/components/ui/ToolCardSkeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Grid3X3, List, SlidersHorizontal, X, Sparkles, Bot, Loader2, ChevronLeft, ChevronRight, Wrench, Tag, Gift, CreditCard, Ticket, Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useAISearch } from "@/hooks/useAISearch";
import { useI18n } from "@/lib/i18n";
import { AdUnit } from "@/components/ads/AdUnit";
import { SponsoredToolsSection } from "@/components/tools/SponsoredToolCard";
import { supabase } from "@/integrations/supabase/client";

type SortOption = "popular" | "newest" | "rating" | "name" | "most_claimed";
type ViewMode = "grid" | "list";
type DealTypeFilter = "all" | "free_credits" | "discount" | "free_trial" | "freebies" | "promo_codes";

const PAGE_SIZES = [12, 24, 48];

// Deal type filter config with icons
const DEAL_TYPE_FILTERS: { value: DealTypeFilter; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "Tất cả", icon: Wrench },
  { value: "discount", label: "Giảm giá", icon: Tag },
  { value: "free_credits", label: "Free Credits", icon: CreditCard },
  { value: "free_trial", label: "Free Trial", icon: Zap },
  { value: "freebies", label: "Miễn phí", icon: Gift },
  { value: "promo_codes", label: "Promo Codes", icon: Ticket },
];

export default function ToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "all";
  const initialPricing = searchParams.get("pricing") || "all";
  const initialSort = (searchParams.get("sort") as SortOption) || "popular";
  const initialDealType = (searchParams.get("deal_type") as DealTypeFilter) || "all";
  const isSimilarQuery = initialQ.toLowerCase().startsWith("similar to ");
  const { t } = useI18n();

  const [query, setQuery] = useState(initialQ);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("toolscope_view_mode") as ViewMode) || "grid";
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    const stored = localStorage.getItem("toolscope_page_size");
    return stored ? parseInt(stored) : 24;
  });
  const [pricingFilter, setPricingFilter] = useState(initialPricing);
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [dealTypeFilter, setDealTypeFilter] = useState<DealTypeFilter>(initialDealType);
  const [showFilters, setShowFilters] = useState(false);
  const [aiMode, setAiMode] = useState(isSimilarQuery);
  const [page, setPage] = useState(0);

  const debouncedQuery = useDebounce(query, 300);
  const aiSearch = useAISearch();

  useEffect(() => {
    if (isSimilarQuery && initialQ) aiSearch.search(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist view mode & page size
  useEffect(() => { localStorage.setItem("toolscope_view_mode", viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem("toolscope_page_size", pageSize.toString()); }, [pageSize]);

  // Sync URL params whenever filters change
  const syncParams = useCallback((overrides: Record<string, string> = {}) => {
    const params: Record<string, string> = {};
    if (debouncedQuery && !aiMode) params.q = debouncedQuery;
    if (sortBy !== "popular") params.sort = sortBy;
    if (pricingFilter !== "all") params.pricing = pricingFilter;
    if (categoryFilter !== "all") params.category = categoryFilter;
    if (dealTypeFilter !== "all") params.deal_type = dealTypeFilter;
    setSearchParams({ ...params, ...overrides }, { replace: true });
  }, [debouncedQuery, sortBy, pricingFilter, categoryFilter, dealTypeFilter, aiMode, setSearchParams]);

  // Auto-search and URL update on debounced query change
  useEffect(() => {
    if (!aiMode) { setPage(0); syncParams(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  // Fetch deal type counts for filter badges
  const { data: dealTypeCounts } = useQuery({
    queryKey: ["deal-type-counts"],
    queryFn: async () => {
      const { data } = await (supabase.from("deals") as any)
        .select("discount_type")
        .eq("is_active", true);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((d: any) => {
        const type = d.discount_type || "other";
        counts[type] = (counts[type] || 0) + 1;
      });
      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: toolsResult, isLoading } = useQuery({
    queryKey: ["tools-list", debouncedQuery, sortBy, pricingFilter, categoryFilter, dealTypeFilter, page, pageSize],
    queryFn: () => fetchToolsList({
      search: debouncedQuery && !aiMode ? debouncedQuery : undefined,
      sortBy: sortBy === "most_claimed" ? "popular" : sortBy,
      pricingFilter,
      categoryFilter,
      page,
      pageSize,
    }),
    enabled: !aiMode || !debouncedQuery,
  });

  const tools = toolsResult?.data;
  const totalCount = toolsResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (aiMode) aiSearch.search(query.trim());
  };

  const handleSortChange = (v: SortOption) => { setSortBy(v); setPage(0); syncParams({ sort: v !== "popular" ? v : "" }); };
  const handlePricingChange = (v: string) => { setPricingFilter(v); setPage(0); syncParams({ pricing: v !== "all" ? v : "" }); };
  const handleCategoryChange = (v: string) => { setCategoryFilter(v); setPage(0); syncParams({ category: v !== "all" ? v : "" }); };
  const handleDealTypeChange = (v: DealTypeFilter) => { setDealTypeFilter(v); setPage(0); syncParams({ deal_type: v !== "all" ? v : "" }); };
  const toggleAiMode = () => { setAiMode(!aiMode); aiSearch.clear(); };

  const activeFilters = [
    pricingFilter !== "all" && pricingFilter,
    categoryFilter !== "all" && categories?.find((c) => c.id === categoryFilter)?.name,
    dealTypeFilter !== "all" && DEAL_TYPE_FILTERS.find((f) => f.value === dealTypeFilter)?.label,
  ].filter(Boolean);

  const showAiResults = aiMode && aiSearch.results && aiSearch.results.length > 0;

  const pricingFilters = [
    { value: "all", label: t("tools.filter.all") },
    { value: "free", label: t("tools.filter.free") },
    { value: "freemium", label: t("tools.filter.freemium") },
    { value: "paid", label: t("tools.filter.paid") },
    { value: "open_source", label: t("tools.filter.openSource") },
  ];

  // Map deal type counts to filter labels
  const getDealTypeCount = (type: DealTypeFilter): number | undefined => {
    if (type === "all" || !dealTypeCounts) return undefined;
    const typeMap: Record<string, string[]> = {
      discount: ["percentage", "fixed"],
      free_credits: ["free_credits", "credits"],
      free_trial: ["free_trial"],
      freebies: ["free", "freebie"],
      promo_codes: ["promo", "coupon"],
    };
    const keys = typeMap[type] || [type];
    return keys.reduce((sum, k) => sum + (dealTypeCounts[k] || 0), 0) || undefined;
  };

  return (
    <PageLayout title={t("tools.title")} description={t("tools.subtitle")}>
        <div className="container py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">{t("tools.title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("tools.subtitle")}</p>
          </div>

          {/* Deal Type Filter Pills (Resourify-style) */}
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {DEAL_TYPE_FILTERS.map((filter) => {
              const count = getDealTypeCount(filter.value);
              const isActive = dealTypeFilter === filter.value;
              const Icon = filter.icon;
              return (
                <button
                  key={filter.value}
                  onClick={() => handleDealTypeChange(filter.value)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {filter.label}
                  {count != null && count > 0 && (
                    <span className={`ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-foreground/10 text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <form onSubmit={handleSearch} className="relative flex-1">
              {aiMode ? <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" /> : <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={aiMode ? t("tools.aiPlaceholder") : t("tools.searchPlaceholder")} className={`h-10 pl-10 ${aiMode ? "border-primary/40 ring-1 ring-primary/20" : ""}`} />
            </form>
            <div className="flex items-center gap-2">
              <Button variant={aiMode ? "default" : "outline"} size="sm" onClick={toggleAiMode} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> AI Search
              </Button>
              {!aiMode && (
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> {t("tools.filters")}
                  {activeFilters.length > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">{activeFilters.length}</span>}
                </Button>
              )}
              <Select value={sortBy} onValueChange={(v) => handleSortChange(v as SortOption)}>
                <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">{t("tools.sort.popular")}</SelectItem>
                  <SelectItem value="newest">{t("tools.sort.newest")}</SelectItem>
                  <SelectItem value="rating">{t("tools.sort.rating")}</SelectItem>
                  <SelectItem value="name">{t("tools.sort.name")}</SelectItem>
                  <SelectItem value="most_claimed">Most Claimed</SelectItem>
                </SelectContent>
              </Select>
              {/* Page size selector */}
              <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(0); }}>
                <SelectTrigger className="h-9 w-[70px] hidden sm:flex"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={s.toString()}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="hidden sm:flex gap-1 rounded-md border border-border p-0.5">
                <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("grid")}><Grid3X3 className="h-3.5 w-3.5" /></Button>
                <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("list")}><List className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>

          {showFilters && !aiMode && (
            <div className="mb-6 rounded-xl border border-border bg-card p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("tools.filter.category")}</label>
                  <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                    <SelectTrigger><SelectValue placeholder={t("tools.filter.all")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("tools.filter.allCategories")}</SelectItem>
                      {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("tools.filter.price")}</label>
                  <Select value={pricingFilter} onValueChange={handlePricingChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {pricingFilters.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {activeFilters.length > 0 && !aiMode && (
            <div className="mb-4 flex flex-wrap gap-2">
              {activeFilters.map((f) => (
                <Badge key={f as string} variant="secondary" className="gap-1 px-3 py-1">
                  {f as string}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => {
                    if (pricingFilter === f) handlePricingChange("all");
                    else if (DEAL_TYPE_FILTERS.find((dt) => dt.label === f)) handleDealTypeChange("all");
                    else handleCategoryChange("all");
                  }} />
                </Badge>
              ))}
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { handlePricingChange("all"); handleCategoryChange("all"); handleDealTypeChange("all"); }}>{t("tools.clearFilters")}</button>
            </div>
          )}

          {aiMode && aiSearch.loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /><span>{t("tools.aiSearching")}</span>
            </div>
          )}

          {showAiResults && (
            <div className="mb-6">
              {aiSearch.summary && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p className="text-sm">{aiSearch.summary}</p>
                </div>
              )}
              <p className="mb-4 text-sm text-muted-foreground">{aiSearch.results!.length} {t("tools.aiResults")}</p>
              <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                {aiSearch.results!.map((r: any) => r.tool && (
                  <div key={r.id} className="relative">
                    <ToolCard id={r.tool.id} name={r.tool.name} slug={r.tool.slug} shortDescription={r.reason} logoUrl={r.tool.logo_url || undefined} websiteUrl={r.tool.website_url || undefined} pricingType={r.tool.pricing_type} avgRating={Number(r.tool.avg_rating) || 0} ratingCount={r.tool.rating_count} categoryName={r.tool.categories?.name} isTrending={r.tool.is_trending} isAiRecommended={r.tool.ai_scores?.is_recommended} aiScore={r.tool.ai_scores?.overall_score ? Number(r.tool.ai_scores.overall_score) : undefined} viewCount={r.tool.view_count || 0} updatedAt={r.tool.updated_at || undefined} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiMode && aiSearch.results && aiSearch.results.length === 0 && !aiSearch.loading && (
            <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-lg font-medium">{t("tools.noAiResults")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("tools.noAiResultsHint")}</p>
            </div>
          )}

          {!aiMode && (
            <>
              {isLoading ? (
                <ToolCardSkeletonGrid count={9} variant={viewMode} />
              ) : tools && tools.length > 0 ? (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">{totalCount} {t("tools.count")}</p>
                  <SponsoredToolsSection className="mb-6" />
                  <AdUnit slotId="between_tools" className="mb-4" />
                  <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                    {tools.map((tool) => (
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
                        createdAt={tool.created_at || undefined}
                        variant={viewMode}
                        viewCount={tool.view_count || 0}
                        updatedAt={tool.updated_at || undefined}
                      />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" /> {t("tools.prevPage")}
                      </Button>
                      <span className="text-sm text-muted-foreground">{t("tools.pageOf")} {page + 1} / {totalPages}</span>
                      <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                        {t("tools.nextPage")} <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  icon={Wrench}
                  title={t("tools.noResults")}
                  description={t("tools.noResultsHint")}
                  action={activeFilters.length > 0 ? {
                    label: t("tools.clearFilters"),
                    onClick: () => { handlePricingChange("all"); handleCategoryChange("all"); handleDealTypeChange("all"); },
                    variant: "outline",
                  } : undefined}
                />
              )}
            </>
          )}
        </div>
    </PageLayout>
  );
}
