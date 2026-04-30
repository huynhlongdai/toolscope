import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useTranslatedList } from "@/hooks/useTranslatedContent";
import { PageLayout } from "@/components/layout/PageLayout";
import { DealCard } from "@/components/deals/DealCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag, Search } from "lucide-react";

export default function DealsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [discountFilter, setDiscountFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["public-deals"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("deals") as any)
        .select("*, tools(name, slug, logo_url)")
        .eq("is_active", true)
        .order("is_exclusive", { ascending: false })
        .order("discount_value", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((d: any) => !d.expires_at || new Date(d.expires_at) > new Date());
    },
  });

  const dealIds = useMemo(() => deals.map((d: any) => d.id), [deals]);
  const fallbacks = useMemo(() => {
    const fb: Record<string, Record<string, string | undefined>> = {};
    deals.forEach((d: any) => { fb[d.id] = { title: d.title, description: d.description ?? undefined }; });
    return fb;
  }, [deals]);

  const { translationsMap } = useTranslatedList("deal", dealIds, ["title", "description"], fallbacks);

  const filtered = deals
    .filter((d: any) => {
      const translatedTitle = translationsMap[d.id]?.title || d.title;
      const matchSearch = !search || translatedTitle.toLowerCase().includes(search.toLowerCase()) || d.tools?.name?.toLowerCase().includes(search.toLowerCase());
      const matchType = discountFilter === "all" || d.discount_type === discountFilter;
      return matchSearch && matchType;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "discount") return (b.discount_value || 0) - (a.discount_value || 0);
      if (sortBy === "expiring") {
        const aExp = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
        const bExp = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
        return aExp - bExp;
      }
      if (sortBy === "popular") return (b.click_count || 0) - (a.click_count || 0);
      return 0;
    });

  return (
    <PageLayout title={`${t("deals.pageTitle")} - ToolScope`} description={t("deals.pageSubtitle")}>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Tag className="h-7 w-7 text-primary" /> {t("deals.pageTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("deals.pageSubtitle")}</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("deals.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={discountFilter} onValueChange={setDiscountFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("deals.allTypes")}</SelectItem>
              <SelectItem value="percentage">{t("deals.percentage")}</SelectItem>
              <SelectItem value="fixed">{t("deals.fixed")}</SelectItem>
              <SelectItem value="free_trial">{t("deals.freeTrial")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sắp xếp" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Mặc định</SelectItem>
              <SelectItem value="newest">Mới nhất</SelectItem>
              <SelectItem value="discount">Giảm nhiều nhất</SelectItem>
              <SelectItem value="expiring">Sắp hết hạn</SelectItem>
              <SelectItem value="popular">Phổ biến nhất</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("deals.noDeals")}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((deal: any) => (
              <div key={deal.id}>
                {deal.tools?.name && (
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 truncate">{deal.tools.name}</p>
                )}
                <DealCard
                  deal={{
                    ...deal,
                    title: translationsMap[deal.id]?.title || deal.title,
                    description: translationsMap[deal.id]?.description || deal.description,
                  }}
                  toolName={deal.tools?.name}
                  toolSlug={deal.tools?.slug}
                  toolLogoUrl={deal.tools?.logo_url}
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {filtered.length} {t("deals.activeCount")}
        </div>
      </div>
    </PageLayout>
  );
}
