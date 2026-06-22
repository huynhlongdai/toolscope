import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { Star, ExternalLink, TrendingUp, Users, Clock, Flame, Sparkles } from "lucide-react";
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
  dealValueLabel?: string;
  claimCount?: number;
  updatedAt?: string;
  viewCount?: number;
  rank?: number;
}

const pricingConfig: Record<string, { label: string; className: string }> = {
  free: { label: "Free", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  freemium: { label: "Freemium", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  paid: { label: "Paid", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  open_source: { label: "Open Source", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  contact: { label: "Contact", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
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
  rank,
}: ToolCardProps) {
  const resolvedLogo = getToolLogoUrl(logoUrl, websiteUrl);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isNew = createdAt
    ? (Date.now() - new Date(createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000
    : false;

  const isHot = (viewCount ?? 0) >= 100 || (claimCount ?? 0) >= 50;

  const pricing = pricingConfig[pricingType] || pricingConfig.contact;

  const logoEl = (
    <div className={cn(
      "relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/60 text-lg font-bold text-muted-foreground overflow-hidden",
      variant === "list" ? "h-11 w-11" : "h-12 w-12"
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${pricing.className}`}>
      {pricing.label}
    </span>
  );

  const ratingEl = ratingCount > 0 && (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      {avgRating.toFixed(1)}
      <span className="text-[10px]">({ratingCount})</span>
    </span>
  );

  const aiScoreEl = aiScore != null && aiScore > 0 && (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-primary tabular-nums">
        AI {aiScore.toFixed(1)}
      </span>
      <div className="h-1.5 w-10 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${Math.min(aiScore * 10, 100)}%` }}
        />
      </div>
    </div>
  );

  const trialEl = hasFreeTrial && (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
      {trialDays ? `${trialDays}d trial` : "Free Trial"}
      {requiresCard === false && " · No card"}
    </span>
  );

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

  // LIST variant
  if (variant === "list") {
    return (
      <Link to={`/tool/${slug}`}>
        <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:border-primary/20 border-accent-hover">
          <CardContent className="flex items-center gap-4 p-4">
            {rank != null && (
              <span className={cn(
                "text-sm font-bold tabular-nums w-7 text-center shrink-0",
                rank <= 3 ? "text-primary" : "text-muted-foreground"
              )}>
                #{rank}
              </span>
            )}
            {logoEl}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                  {name}
                </h3>
                {isAiRecommended && (
                  <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] px-1.5 py-0 border-0">
                    <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI Pick
                  </Badge>
                )}
                {isTrending && <TrendingUp className="h-3.5 w-3.5 text-coral-500 shrink-0" />}
                {isNew && (
                  <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 border-0">New</Badge>
                )}
                {isHot && !isTrending && (
                  <Badge variant="outline" className="border-coral-400 text-coral-500 text-[10px] px-1.5 py-0">
                    <Flame className="h-2.5 w-2.5 mr-0.5" /> Hot
                  </Badge>
                )}
              </div>
              {shortDescription && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{shortDescription}</p>
              )}
              {socialProofEl}
            </div>
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              {dealValueLabel && (
                <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] px-2 py-0.5 font-bold border-0">
                  {dealValueLabel}
                </Badge>
              )}
              {categoryName && (
                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">{categoryName}</span>
              )}
              {pricingBadge}
              {trialEl}
              {ratingEl}
              {aiScoreEl}
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 shrink-0" />
          </CardContent>
        </Card>
      </Link>
    );
  }

  // GRID variant (default)
  return (
    <Link to={`/tool/${slug}`}>
      <Card className="group relative overflow-hidden card-hover hover:border-primary/20">
        {/* Top right badges */}
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1">
          {dealValueLabel && (
            <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[11px] px-2.5 py-0.5 font-bold shadow-sm border-0">
              {dealValueLabel}
            </Badge>
          )}
          {isAiRecommended && (
            <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] px-2 py-0.5 border-0">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI Pick
            </Badge>
          )}
          {isNew && (
            <Badge className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 border-0">New</Badge>
          )}
          {isHot && !isTrending && (
            <Badge variant="outline" className="border-coral-400 text-coral-500 bg-coral-50 dark:bg-coral-950/30 text-[10px] px-2 py-0.5">
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
                {isTrending && <TrendingUp className="h-3.5 w-3.5 text-coral-500 shrink-0" />}
              </div>
              {shortDescription && (
                <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{shortDescription}</p>
              )}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {categoryName && (
                  <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">{categoryName}</span>
                )}
                {pricingBadge}
                {trialEl}
              </div>
              <div className="mt-2.5 flex items-center gap-3">
                {ratingEl}
                {aiScoreEl}
              </div>
              {socialProofEl && <div className="mt-2">{socialProofEl}</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});
