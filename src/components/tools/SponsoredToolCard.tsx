import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ExternalLink, Award, Sparkles } from "lucide-react";
import { getToolLogoUrl } from "@/lib/favicon";
import { useI18n } from "@/lib/i18n";

interface SponsoredTool {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  logo_url: string | null;
  website_url: string | null;
  pricing_type: string;
  avg_rating: number;
  rating_count: number;
  affiliate_url: string | null;
}

export function SponsoredToolsSection({ className }: { className?: string }) {
  const { t } = useI18n();

  const { data: sponsoredTools = [] } = useQuery({
    queryKey: ["sponsored-tools"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tools")
        .select("id, name, slug, short_description, logo_url, website_url, pricing_type, avg_rating, rating_count, affiliate_url")
        .eq("status", "published")
        .eq("is_featured", true)
        .order("avg_rating", { ascending: false })
        .limit(3);
      return (data as SponsoredTool[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (sponsoredTools.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Sponsored
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {sponsoredTools.map((tool) => {
          const logo = getToolLogoUrl(tool.logo_url, tool.website_url);
          return (
            <Card
              key={tool.id}
              className="overflow-hidden border-amber-200/60 bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 dark:border-amber-800/30 card-hover hover:border-amber-300/80"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-muted border border-border/60 shadow-sm">
                    {logo ? (
                      <img src={logo} alt={tool.name} className="h-8 w-8 rounded-lg object-contain" />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{tool.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/tool/${tool.slug}`} className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1">
                      {tool.name}
                    </Link>
                    {tool.short_description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tool.short_description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {Number(tool.avg_rating) > 0 && (
                        <span className="flex items-center gap-0.5 text-xs">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {Number(tool.avg_rating).toFixed(1)}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-[10px]">
                        {tool.pricing_type}
                      </Badge>
                    </div>
                  </div>
                </div>
                {(tool.affiliate_url || tool.website_url) && (
                  <Button asChild variant="outline" size="sm" className="w-full mt-3 h-8 text-xs border-amber-200/80 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/30">
                    <a href={tool.affiliate_url || tool.website_url!} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1.5" />
                      {t("tools.tryNow") || "Try Now"}
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
