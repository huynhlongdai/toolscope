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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Search, Grid3X3, List, SlidersHorizontal, X, Sparkles, Bot, Loader2, ChevronLeft, ChevronRight, Wrench, ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useAISearch } from "@/hooks/useAISearch";
import { useI18n } from "@/lib/i18n";
import { AdUnit } from "@/components/ads/AdUnit";

type SortOption = "popular" | "newest" | "rating" | "name";
type ViewMode = "grid" | "list";
const PAGE_SIZE = 24;

export default function ToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  // "category" URL param supports comma-separated ids for multi-select
  const initialCategories = (searchParams.get("category") || "").split(",").filter(Boolean);
  const initialPricing = searchParams.get("pricing") || "all";
  const initialSort = (searchParams.get("sort") as SortOption) || "popular";
  const initialFreeTrial = searchParams.get("trial") === "1";
  const initialMinAiScore = Number(searchParams.get("aiScore")) || 0;
  const isSimilarQuery = initialQ.toLowerCase().startsWith("similar to ");
  const { t } = useI18n();

  const [query, setQuery] = useState(initialQ);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [pricingFilter, setPricingFilter] = useState(initialPricing);
  const [categoryFilters, setCategoryFilters] = useState<string[]>(initialCategories);
  const [freeTrialOnly, setFreeTrialOnly] = useState(initialFreeTrial);
  const [minAiScore, setMinAiScore] = useState(initialMinAiScore);
  const [showFilters, setShowFilters] = useState(false);
  const [aiMode, setAiMode] = useState(isSimilarQuery);
  const [page, setPage] = useState(0);

  const debouncedQuery = useDebounce(query, 300);
  const aiSearch = useAISearch();

  useEffect(() => {
    if (isSimilarQuery && initialQ) aiSearch.search(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL params whenever filters change
  const syncParams = useCallback((overrides: Record<string, string> = {}) => {
    const params: Record<string, string> = {};
    if (debouncedQuery && !aiMode) params.q = debouncedQuery;
    if (sortBy !== "popular") params.sort = sortBy;
    if (pricingFilter !== "all") params.pricing = pricingFilter;
    if (categoryFilters.length > 0) params.category = categoryFilters.join(",");
    if (freeTrialOnly) params.trial = "1";
    if (minAiScore > 0) params.aiScore = String(minAiScore);
    setSearchParams({ ...params, ...overrides }, { replace: true });
  }, [debouncedQuery, sortBy, pricingFilter, categoryFilters, freeTrialOnly, minAiScore, aiMode, setSearchParams]);

  // Auto-search and URL update on debounced query change
  useEffect(() => {
    if (!aiMode) { setPage(0); syncParams(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: toolsResult, isLoading } = useQuery({
    queryKey: ["tools-list", debouncedQuery, sortBy, pricingFilter, categoryFilters, freeTrialOnly, minAiScore, page],
    queryFn: () => fetchToolsList({
      search: debouncedQuery && !aiMode ? debouncedQuery : undefined,
      sortBy,
      pricingFilter,
      categoryFilters,
      freeTrialOnly,
      minAiScore,
      page,
      pageSize: PAGE_SIZE,
    }),
    enabled: !aiMode || !debouncedQuery,
  });

  const tools = toolsResult?.data;
  const totalCount = toolsResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (aiMode) aiSearch.search(query.trim());
  };

  const handleSortChange = (v: SortOption) => { setSortBy(v); setPage(0); syncParams({ sort: v !== "popular" ? v : "" }); };
  const handlePricingChange = (v: string) => { setPricingFilter(v); setPage(0); syncParams({ pricing: v !== "all" ? v : "" }); };
  const toggleCategory = (id: string) => {
    const next = categoryFilters.includes(id) ? categoryFilters.filter((c) => c !== id) : [...categoryFilters, id];
    setCategoryFilters(next);
    setPage(0);
    syncParams({ category: next.length > 0 ? next.join(",") : "" });
  };
  const clearCategories = () => { setCategoryFilters([]); setPage(0); syncParams({ category: "" }); };
  const toggleFreeTrial = () => {
    const next = !freeTrialOnly;
    setFreeTrialOnly(next);
    setPage(0);
    syncParams({ trial: next ? "1" : "" });
  };
  const handleMinAiScoreChange = (v: number) => {
    setMinAiScore(v);
    setPage(0);
    syncParams({ aiScore: v > 0 ? String(v) : "" });
  };
  const toggleAiMode = () => { setAiMode(!aiMode); aiSearch.clear(); };

  const activeFilters = [
    pricingFilter !== "all" && { key: "pricing", label: pricingFilter },
    ...categoryFilters.map((id) => ({ key: `category:${id}`, label: categories?.find((c) => c.id === id)?.name || id })),
    freeTrialOnly && { key: "trial", label: t("tools.filter.freeTrial") },
    minAiScore > 0 && { key: "aiScore", label: `AI ≥ ${minAiScore}` },
  ].filter(Boolean) as { key: string; label: string }[];

  const clearAllFilters = () => {
    handlePricingChange("all");
    clearCategories();
    if (freeTrialOnly) toggleFreeTrial();
    if (minAiScore > 0) handleMinAiScoreChange(0);
  };

  const removeActiveFilter = (key: string) => {
    if (key === "pricing") handlePricingChange("all");
    else if (key.startsWith("category:")) toggleCategory(key.slice("category:".length));
    else if (key === "trial") toggleFreeTrial();
    else if (key === "aiScore") handleMinAiScoreChange(0);
  };

  const showAiResults = aiMode && aiSearch.results && aiSearch.results.length > 0;

  const pricingFilters = [
    { value: "all", label: t("tools.filter.all") },
    { value: "free", label: t("tools.filter.free") },
    { value: "freemium", label: t("tools.filter.freemium") },
    { value: "paid", label: t("tools.filter.paid") },
    { value: "open_source", label: t("tools.filter.openSource") },
  ];

  return (
    <PageLayout title={t("tools.title")} description={t("tools.subtitle")}>
        <div className="container py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t("tools.title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("tools.subtitle")}</p>
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
                <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">{t("tools.sort.popular")}</SelectItem>
                  <SelectItem value="newest">{t("tools.sort.newest")}</SelectItem>
                  <SelectItem value="rating">{t("tools.sort.rating")}</SelectItem>
                  <SelectItem value="name">{t("tools.sort.name")}</SelectItem>
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("tools.filter.category")}</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal">
                        <span className="truncate">
                          {categoryFilters.length > 0
                            ? `${categoryFilters.length} ${t("tools.filter.categoryCount")}`
                            : t("tools.filter.allCategories")}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="max-h-64 space-y-0.5 overflow-y-auto">
                        {categories?.map((c) => (
                          <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                            <Checkbox checked={categoryFilters.includes(c.id)} onCheckedChange={() => toggleCategory(c.id)} />
                            {c.name}
                          </label>
                        ))}
                      </div>
                      {categoryFilters.length > 0 && (
                        <button className="mt-1 w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:text-foreground" onClick={clearCategories}>
                          {t("tools.clearFilters")}
                        </button>
                      )}
                    </PopoverContent>
                  </Popover>
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
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Checkbox checked={freeTrialOnly} onCheckedChange={toggleFreeTrial} />
                    {t("tools.filter.freeTrial")}
                  </label>
                </div>
                <div>
                  <label className="mb-2 flex items-center justify-between text-sm font-medium">
                    <span>{t("tools.filter.aiScore")}</span>
                    <span className="text-xs text-muted-foreground">{minAiScore > 0 ? `≥ ${minAiScore}` : t("tools.filter.all")}</span>
                  </label>
                  <Slider
                    value={[minAiScore]}
                    onValueChange={([v]) => setMinAiScore(v)}
                    onValueCommit={([v]) => handleMinAiScoreChange(v)}
                    min={0}
                    max={10}
                    step={0.5}
                    className="mt-3"
                  />
                </div>
              </div>
            </div>
          )}

          {activeFilters.length > 0 && !aiMode && (
            <div className="mb-4 flex flex-wrap gap-2">
              {activeFilters.map((f) => (
                <Badge key={f.key} variant="secondary" className="gap-1 px-3 py-1">
                  {f.label}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeActiveFilter(f.key)} />
                </Badge>
              ))}
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={clearAllFilters}>{t("tools.clearFilters")}</button>
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
                    <ToolCard id={r.tool.id} name={r.tool.name} slug={r.tool.slug} shortDescription={r.reason} logoUrl={r.tool.logo_url || undefined} websiteUrl={r.tool.website_url || undefined} pricingType={r.tool.pricing_type} avgRating={Number(r.tool.avg_rating) || 0} ratingCount={r.tool.rating_count} categoryName={r.tool.categories?.name} isTrending={r.tool.is_trending} isAiRecommended={r.tool.ai_scores?.is_recommended} aiScore={r.tool.ai_scores?.overall_score ? Number(r.tool.ai_scores.overall_score) : undefined} />
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
                  <AdUnit slotId="between_tools" className="mb-4" />
                  <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                    {tools.map((tool) => (
                      <ToolCard key={tool.id} id={tool.id} name={tool.name} slug={tool.slug} shortDescription={tool.short_description || undefined} logoUrl={tool.logo_url || undefined} websiteUrl={tool.website_url || undefined} pricingType={tool.pricing_type} avgRating={Number(tool.avg_rating) || 0} ratingCount={tool.rating_count} categoryName={(tool.categories as any)?.name} isTrending={tool.is_trending} isAiRecommended={(tool.ai_scores as any)?.is_recommended} aiScore={(tool.ai_scores as any)?.overall_score ? Number((tool.ai_scores as any).overall_score) : undefined} createdAt={tool.created_at || undefined} />
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
                    onClick: clearAllFilters,
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
