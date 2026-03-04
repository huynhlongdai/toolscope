import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToolCard } from "@/components/tools/ToolCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Grid3X3, List, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type SortOption = "popular" | "newest" | "rating" | "name";
type ViewMode = "grid" | "list";

const pricingFilters = [
  { value: "all", label: "Tất cả" },
  { value: "free", label: "Miễn phí" },
  { value: "freemium", label: "Freemium" },
  { value: "paid", label: "Trả phí" },
  { value: "open_source", label: "Open Source" },
];

export default function ToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "all";

  const [query, setQuery] = useState(initialQ);
  const [search, setSearch] = useState(initialQ);
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [pricingFilter, setPricingFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: tools, isLoading } = useQuery({
    queryKey: ["tools-list", search, sortBy, pricingFilter, categoryFilter],
    queryFn: async () => {
      let q = supabase
        .from("tools")
        .select("*, categories(name), ai_scores(overall_score, is_recommended)")
        .eq("status", "published");

      if (search) q = q.or(`name.ilike.%${search}%,short_description.ilike.%${search}%`);
      if (pricingFilter !== "all") q = q.eq("pricing_type", pricingFilter as any);
      if (categoryFilter !== "all") q = q.eq("category_id", categoryFilter);

      if (sortBy === "popular") q = q.order("view_count", { ascending: false });
      else if (sortBy === "newest") q = q.order("created_at", { ascending: false });
      else if (sortBy === "rating") q = q.order("avg_rating", { ascending: false });
      else q = q.order("name");

      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(query);
    setSearchParams(query ? { q: query } : {});
  };

  const activeFilters = [
    pricingFilter !== "all" && pricingFilter,
    categoryFilter !== "all" && categories?.find((c) => c.id === categoryFilter)?.name,
  ].filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Khám phá công cụ
            </h1>
            <p className="mt-1 text-muted-foreground">Tìm và so sánh hàng ngàn công cụ phù hợp</p>
          </div>

          {/* Search & Controls */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm công cụ..."
                className="h-10 pl-10"
              />
            </form>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Bộ lọc
                {activeFilters.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {activeFilters.length}
                  </span>
                )}
              </Button>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Phổ biến</SelectItem>
                  <SelectItem value="newest">Mới nhất</SelectItem>
                  <SelectItem value="rating">Rating cao</SelectItem>
                  <SelectItem value="name">Tên A-Z</SelectItem>
                </SelectContent>
              </Select>
              <div className="hidden sm:flex gap-1 rounded-md border border-border p-0.5">
                <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("grid")}>
                  <Grid3X3 className="h-3.5 w-3.5" />
                </Button>
                <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("list")}>
                  <List className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-6 rounded-xl border border-border bg-card p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Danh mục</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả danh mục</SelectItem>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Giá</label>
                  <Select value={pricingFilter} onValueChange={setPricingFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {pricingFilters.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Active filters */}
          {activeFilters.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {activeFilters.map((f) => (
                <Badge key={f as string} variant="secondary" className="gap-1 px-3 py-1">
                  {f as string}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => {
                    if (pricingFilter === f) setPricingFilter("all");
                    else setCategoryFilter("all");
                  }} />
                </Badge>
              ))}
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setPricingFilter("all"); setCategoryFilter("all"); }}>
                Xóa tất cả
              </button>
            </div>
          )}

          {/* Results */}
          {isLoading ? (
            <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : tools && tools.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">{tools.length} công cụ</p>
              <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                {tools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    id={tool.id}
                    name={tool.name}
                    slug={tool.slug}
                    shortDescription={tool.short_description || undefined}
                    logoUrl={tool.logo_url || undefined}
                    pricingType={tool.pricing_type}
                    avgRating={Number(tool.avg_rating) || 0}
                    ratingCount={tool.rating_count}
                    categoryName={(tool.categories as any)?.name}
                    isTrending={tool.is_trending}
                    isAiRecommended={(tool.ai_scores as any)?.is_recommended}
                    aiScore={(tool.ai_scores as any)?.overall_score ? Number((tool.ai_scores as any).overall_score) : undefined}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
              <Search className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-lg font-medium">Không tìm thấy công cụ</p>
              <p className="mt-1 text-sm text-muted-foreground">Thử thay đổi từ khóa hoặc bộ lọc</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
