import { Link } from "react-router-dom";
import { Star, Check, X, ExternalLink, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToolLogoUrl } from "@/lib/favicon";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ListicleItemTool {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  website_url?: string | null;
  affiliate_url?: string | null;
  short_description?: string | null;
  avg_rating?: number | null;
}

export interface ListicleItemData {
  rank: number;
  tool_id: string;
  badge?: string | null; // e.g. "Best Overall", "Best for Beginners", "Best Value"
  highlight?: string | null; // 1-2 sentence "why it made the list"
  pros?: string[] | null;
  cons?: string[] | null;
  ctaLabel?: string | null;
}

interface ListicleItemProps {
  item: ListicleItemData;
  tool: ListicleItemTool;
  className?: string;
}

/**
 * Ranked list-item card for "Top N" listicle articles. Rank #1 gets a
 * gold ribbon treatment; every card carries its own affiliate CTA so
 * readers can act without scrolling back to the top.
 */
export function ListicleItem({ item, tool, className }: ListicleItemProps) {
  const { t } = useI18n();
  const logo = getToolLogoUrl(tool.logo_url, tool.website_url);
  const affiliateUrl = tool.affiliate_url || tool.website_url;
  const isTopRank = item.rank === 1;

  return (
    <div
      id={`rank-${item.rank}`}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        isTopRank ? "border-rankGold/50 ring-1 ring-rankGold/30" : "border-border",
        className
      )}
    >
      {item.badge && (
        <div
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold",
            isTopRank
              ? "bg-rankGold text-rankGold-foreground"
              : "bg-primary/10 text-primary"
          )}
        >
          {isTopRank && <Award className="h-3.5 w-3.5" />}
          {item.badge}
        </div>
      )}

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
        {/* Rank number */}
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-center sm:gap-1">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-lg font-bold sm:h-12 sm:w-12 sm:text-2xl",
              isTopRank ? "bg-rankGold text-rankGold-foreground" : "bg-primary/10 text-primary"
            )}
          >
            {item.rank}
          </span>
          <span className="text-[10px] font-medium uppercase text-muted-foreground sm:hidden">
            {t("listicle.rank", "Rank")}
          </span>
        </div>

        {/* Tool info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-base font-bold text-muted-foreground">
              {logo ? (
                <img src={logo} alt={tool.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                tool.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/tool/${tool.slug}`}
                  className="font-heading text-base font-bold text-foreground hover:text-primary transition-colors"
                >
                  {tool.name}
                </Link>
                {tool.avg_rating != null && tool.avg_rating > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {tool.avg_rating.toFixed(1)}
                  </span>
                )}
              </div>
              {(item.highlight || tool.short_description) && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.highlight || tool.short_description}
                </p>
              )}
            </div>
          </div>

          {((item.pros && item.pros.length > 0) || (item.cons && item.cons.length > 0)) && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {item.pros && item.pros.length > 0 && (
                <ul className="space-y-1">
                  {item.pros.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/90">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
              {item.cons && item.cons.length > 0 && (
                <ul className="space-y-1">
                  {item.cons.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/90">
                      <X className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        {affiliateUrl && (
          <div className="shrink-0 sm:w-40">
            <Button asChild size="sm" className="w-full gap-1.5">
              <a href={affiliateUrl} target="_blank" rel="noopener noreferrer sponsored">
                {item.ctaLabel || t("listicle.tryNow", "Try It")}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
