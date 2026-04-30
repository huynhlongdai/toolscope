import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { ToolCard } from "@/components/tools/ToolCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Grid3X3, List, SlidersHorizontal, X, Sparkles, Bot, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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
  const initialCategory = searchParams.get("category") || "all";
  const isSimilarQuery = initialQ.toLowerCase().startsWith("similar to ");
  const { t } = useI18n();

  const [query, setQuery] = useState(initialQ);
  const [search, setSearch] = useState(isSimilarQuery ? "" : initialQ);
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [pricingFilter, setPricingFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [showFilters, setShowFilters] = useState(false);
  const [aiMode, setAiMode] = useState(isSimilarQuery);
  const [page, setPage] = useState(0);

  const aiSearch = useAISearch();

  useEffect(() => {
    if (isSimilarQuery && initialQ) aiSearch.search(initialQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: toolsResult, isLoading } = useQuery({
    queryKey: ["tools-list", search, sortBy, pricingFilter, categoryFilter, page],
    queryFn: async () => {
      let q = supabase.from("tools").select("*, categories(name), ai_scores(overall_score, is_recommended)", { count: "exact" }).eq("status", "published");
      if (search && !aiMode) q = q.or(`name.ilike.%${search}%,short_description.ilike.%${search}%`);
      if (pricingFilter !== "all") q = q.eq("pricing_type", pricingFilter as any);
      if (categoryFilter !== "all") q = q.eq("category_id", categoryFilter);
      if (sortBy === "popular") q = q.order("view_count", { ascending: false });
      else if (sortBy === "newest") q = q.order("created_at", { ascending: false });
      else if (sortBy === "rating") q = q.order("avg_rating", { ascending: false });
      else q = q.order("name");
      const { data, error, count } = await q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
    enabled: !aiMode || !search,
  });

  const tools = toolsResult?.data;
  const totalCount = toolsResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (aiMode) { aiSearch.search(query.trim()); }
    else { setSearch(query); setSearchParams(query ? { q: query } : {}); }
  };

  const toggleAiMode = () => { setAiMode(!aiMode); aiSearch.clear(); };

  const activeFilters = [
    pricingFilter !== "all" && pricingFilter,
    categoryFilter !== "all" && categories?.find((c) => c.id === categoryFilter)?.name,
  ].filter(Boolean);

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
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("tools.filter.category")}</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger><SelectValue placeholder={t("tools.filter.all")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("tools.filter.allCategories")}</SelectItem>
                      {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">{t("tools.filter.price")}</label>
                  <Select value={pricingFilter} onValueChange={setPricingFilter}>
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
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { if (pricingFilter === f) setPricingFilter("all"); else setCategoryFilter("all"); }} />
                </Badge>
              ))}
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setPricingFilter("all"); setCategoryFilter("all"); }}>{t("tools.clearFilters")}</button>
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
                <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                  {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
              ) : tools && tools.length > 0 ? (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">{totalCount} {t("tools.count")}</p>
                  <AdUnit slotId="between_tools" className="mb-4" />
                  <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                    {tools.map((tool) => (
                      <ToolCard key={tool.id} id={tool.id} name={tool.name} slug={tool.slug} shortDescription={tool.short_description || undefined} logoUrl={tool.logo_url || undefined} websiteUrl={tool.website_url || undefined} pricingType={tool.pricing_type} avgRating={Number(tool.avg_rating) || 0} ratingCount={tool.rating_count} categoryName={(tool.categories as any)?.name} isTrending={tool.is_trending} isAiRecommended={(tool.ai_scores as any)?.is_recommended} aiScore={(tool.ai_scores as any)?.overall_score ? Number((tool.ai_scores as any).overall_score) : undefined} />
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
                <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
                  <Search className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-lg font-medium">{t("tools.noResults")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("tools.noResultsHint")}</p>
                </div>
              )}
            </>
          )}
        </div>
    </PageLayout>
  );
}
