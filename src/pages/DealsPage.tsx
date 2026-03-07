import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { DealCard } from "@/components/deals/DealCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag, Search } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";

export default function DealsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [discountFilter, setDiscountFilter] = useState("all");

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

  const filtered = deals.filter((d: any) => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.tools?.name?.toLowerCase().includes(search.toLowerCase());
    const matchType = discountFilter === "all" || d.discount_type === discountFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SEOHead title={`${t("deals.pageTitle")} - ToolScope`} description={t("deals.pageSubtitle")} />
      <Header />
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Tag className="h-7 w-7 text-primary" /> {t("deals.pageTitle")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("deals.pageSubtitle")}</p>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("deals.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={discountFilter} onValueChange={setDiscountFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("deals.allTypes")}</SelectItem>
              <SelectItem value="percentage">{t("deals.percentage")}</SelectItem>
              <SelectItem value="fixed">{t("deals.fixed")}</SelectItem>
              <SelectItem value="free_trial">{t("deals.freeTrial")}</SelectItem>
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
                <DealCard deal={deal} toolName={deal.tools?.name} toolSlug={deal.tools?.slug} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {filtered.length} {t("deals.activeCount")}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
