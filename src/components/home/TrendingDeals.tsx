import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Tag, ChevronRight, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DealDetailModal } from "@/components/deals/DealDetailModal";
import { useI18n } from "@/lib/i18n";

export function TrendingDeals() {
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const { t } = useI18n();

  const { data: deals } = useQuery({
    queryKey: ["home-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, description, discount_type, discount_value, coupon_code, deal_url, original_price, deal_price, currency, expires_at, is_verified, is_exclusive, tools(name, slug, logo_url)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!deals || deals.length === 0) return null;

  return (
    <>
      <section className="py-10 md:py-14 bg-muted/30" aria-label={t("deals.title")}>
        <div className="container">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl tracking-tight">
                {t("deals.title")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Exclusive deals and discounts</p>
            </div>
            <Link to="/deals" className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              {t("deals.all")} <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {deals.map((deal) => {
              const tool = deal.tools as any;
              return (
                <Card
                  key={deal.id}
                  className="group relative overflow-hidden card-hover cursor-pointer hover:border-primary/20"
                  onClick={() => setSelectedDeal({ ...deal, tool })}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      {tool?.logo_url ? (
                        <img src={tool.logo_url} alt={tool.name} className="h-10 w-10 rounded-lg object-contain shrink-0" loading="lazy" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                          {(tool?.name || "?").charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-semibold truncate block">{tool?.name}</span>
                        {deal.discount_value && (
                          <Badge className="mt-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[11px] font-bold border-0">
                            -{deal.discount_value}{deal.discount_type === "percentage" ? "%" : "$"} OFF
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{deal.title}</p>
                    <Button
                      size="sm"
                      className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-xs font-semibold"
                      onClick={(e) => { e.stopPropagation(); setSelectedDeal({ ...deal, tool }); }}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Claim Deal →
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      {selectedDeal && (
        <DealDetailModal deal={selectedDeal} toolName={selectedDeal.tool?.name} open={!!selectedDeal} onOpenChange={(open) => !open && setSelectedDeal(null)} />
      )}
    </>
  );
}
