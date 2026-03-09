import { Link } from "react-router-dom";
import { Star, ExternalLink, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getToolLogoUrl } from "@/lib/favicon";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  logoUrl?: string;
  websiteUrl?: string;
  pricingType: string;
  avgRating: number;
  ratingCount: number;
  categoryName?: string;
  isFeatured?: boolean;
  isTrending?: boolean;
  isAiRecommended?: boolean;
  aiScore?: number;
  variant?: "grid" | "list";
  hasFreeTrial?: boolean;
  trialDays?: number | null;
  requiresCard?: boolean | null;
}

const pricingLabel: Record<string, string> = {
  free: "Miễn phí",
  freemium: "Freemium",
  paid: "Trả phí",
  open_source: "Open Source",
  contact: "Liên hệ",
};

const pricingColor: Record<string, string> = {
  free: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  freemium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paid: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  open_source: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  contact: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export function ToolCard({
  name,
  slug,
  shortDescription,
  logoUrl,
  websiteUrl,
  pricingType,
  avgRating,
  ratingCount,
  categoryName,
  isTrending,
  isAiRecommended,
  aiScore,
  variant = "grid",
  hasFreeTrial,
  trialDays,
  requiresCard,
}: ToolCardProps) {
  const resolvedLogo = getToolLogoUrl(logoUrl, websiteUrl);

  const logoEl = (
    <div className={cn(
      "flex shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-bold text-muted-foreground",
      variant === "list" ? "h-10 w-10" : "h-12 w-12"
    )}>
      {resolvedLogo ? (
        <img src={resolvedLogo} alt={name} className="h-full w-full rounded-xl object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );

  const pricingBadge = (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${pricingColor[pricingType] || pricingColor.contact}`}>
      {pricingLabel[pricingType] || pricingType}
    </span>
  );

  const ratingEl = ratingCount > 0 && (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      {avgRating.toFixed(1)}
      <span className="text-[10px]">({ratingCount})</span>
    </span>
  );

  const aiEl = aiScore != null && aiScore > 0 && (
    <span className="flex items-center gap-1 text-xs font-medium text-primary">
      AI {aiScore.toFixed(1)}
    </span>
  );

  const trialEl = hasFreeTrial && (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      {trialDays ? `${trialDays}d trial` : "Free Trial"}
      {requiresCard === false && " · No card"}
    </span>
  );

  if (variant === "list") {
    return (
      <Link to={`/tool/${slug}`}>
        <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20">
          <CardContent className="flex items-center gap-4 p-3 sm:p-4">
            {logoEl}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {name}
                </h3>
                {isTrending && <TrendingUp className="h-3.5 w-3.5 text-accent shrink-0" />}
                {isAiRecommended && (
                  <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0">
                    ⚡ AI
                  </Badge>
                )}
              </div>
              {shortDescription && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {shortDescription}
                </p>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              {categoryName && (
                <span className="text-xs text-muted-foreground">{categoryName}</span>
              )}
              {pricingBadge}
              {trialEl}
              {ratingEl}
              {aiEl}
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 shrink-0" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link to={`/tool/${slug}`}>
      <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20">
        {isAiRecommended && (
          <div className="absolute right-3 top-3 z-10">
            <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-2 py-0.5">
              ⚡ AI Recommended
            </Badge>
          </div>
        )}
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {logoEl}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {name}
                </h3>
                {isTrending && <TrendingUp className="h-3.5 w-3.5 text-accent shrink-0" />}
              </div>
              {shortDescription && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {shortDescription}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {categoryName && (
                  <span className="text-xs text-muted-foreground">{categoryName}</span>
                )}
                {pricingBadge}
                {trialEl}
                {ratingEl}
                {aiEl}
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
