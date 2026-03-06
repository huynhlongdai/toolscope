import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Tag, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TrendingDeals() {
  const { data: deals } = useQuery({
    queryKey: ["home-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, title, discount_type, discount_value, coupon_code, deal_url, tools(name, slug, logo_url)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!deals || deals.length === 0) return null;

  return (
    <section className="py-8 md:py-10 bg-muted/30" aria-label="Ưu đãi nổi bật">
      <div className="container">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold md:text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Ưu đãi nổi bật
            </h2>
          </div>
          <Link to="/deals" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Tất cả <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => {
            const tool = deal.tools as any;
            return (
              <Card key={deal.id} className="transition-all hover:shadow-md hover:border-primary/20">
                <CardContent className="flex items-center gap-4 p-4">
                  {tool?.logo_url && (
                    <img src={tool.logo_url} alt={tool.name} className="h-10 w-10 rounded-lg object-contain shrink-0" loading="lazy" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link to={`/tool/${tool?.slug}`} className="text-sm font-semibold truncate hover:text-primary">
                        {tool?.name}
                      </Link>
                      {deal.discount_value && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          -{deal.discount_value}{deal.discount_type === "percentage" ? "%" : "$"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{deal.title}</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 text-xs" asChild>
                    <a href={deal.deal_url || `/tool/${tool?.slug}`} target="_blank" rel="noopener noreferrer">
                      Xem deal
                    </a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
