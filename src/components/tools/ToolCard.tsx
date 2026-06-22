import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { Star, ExternalLink, TrendingUp, Users, Clock, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  createdAt?: string;
  // New props for upgrade plan
  dealValueLabel?: string;
  claimCount?: number;
  updatedAt?: string;
  viewCount?: number;
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

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  if (days < 365) return `${Math.floor(days / 30)} tháng trước`;
  return `${Math.floor(days / 365)} năm trước`;
}

export const ToolCard = memo(function ToolCard({
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
  createdAt,
  dealValueLabel,
  claimCount,
  updatedAt,
  viewCount,
}: ToolCardProps) {
  const resolvedLogo = getToolLogoUrl(logoUrl, websiteUrl);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isNew = createdAt
    ? (Date.now() - new Date(createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000
    : false;

  const isHot = (viewCount ?? 0) >= 100 || (claimCount ?? 0) >= 50;

  const logoEl = (
    <div className={cn(
      "relative flex shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-bold text-muted-foreground overflow-hidden",
      variant === "list" ? "h-10 w-10" : "h-12 w-12"
    )}>
      {resolvedLogo && !imgError ? (
        <>
          {!imgLoaded && <Skeleton className="absolute inset-0 rounded-xl" />}
          <img
            src={resolvedLogo}
            alt={name}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={cn(
              "h-full w-full rounded-xl object-cover transition-opacity duration-200",
              imgLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        </>
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

  // Social proof line: claim count + last updated
  const socialProofEl = ((claimCount && claimCount > 0) || updatedAt) && (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      {claimCount && claimCount > 0 && (
        <span className="flex items-center gap-0.5">
          <Users className="h-3 w-3" />
          {formatCount(claimCount)} claimed
        </span>
      )}
      {claimCount && claimCount > 0 && updatedAt && <span>·</span>}
      {updatedAt && (
        <span className="flex items-center gap-0.5">
          <Clock className="h-3 w-3" />
          {timeAgo(updatedAt)}
        </span>
      )}
    </div>
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
                {isNew && (
                  <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                    New
                  </Badge>
                )}
                {isHot && !isTrending && (
                  <Badge variant="outline" className="border-orange-400 text-orange-500 text-[10px] px-1.5 py-0">
                    <Flame className="h-2.5 w-2.5 mr-0.5" /> Hot
                  </Badge>
                )}
              </div>
              {shortDescription && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {shortDescription}
                </p>
              )}
              {socialProofEl}
            </div>
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              {dealValueLabel && (
                <Badge className="bg-rose-500 text-white text-[10px] px-2 py-0.5 font-bold animate-in fade-in">
                  {dealValueLabel}
                </Badge>
              )}
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
        {/* Top badges: value label, AI, New, Hot */}
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1">
          {dealValueLabel && (
            <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[11px] px-2.5 py-0.5 font-bold shadow-sm">
              {dealValueLabel}
            </Badge>
          )}
          {isAiRecommended && (
            <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-2 py-0.5">
              ⚡ AI Recommended
            </Badge>
          )}
          {isNew && (
            <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0.5">
              New
            </Badge>
          )}
          {isHot && !isTrending && (
            <Badge variant="outline" className="border-orange-400 text-orange-500 bg-orange-50 dark:bg-orange-950/30 text-[10px] px-2 py-0.5">
              <Flame className="h-3 w-3 mr-0.5" /> Hot
            </Badge>
          )}
        </div>
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
              {/* Social proof */}
              {socialProofEl && <div className="mt-2">{socialProofEl}</div>}
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});
