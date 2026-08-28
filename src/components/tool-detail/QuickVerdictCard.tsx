import { Star, Check, X, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToolLogoUrl } from "@/lib/favicon";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface QuickVerdictCardProps {
  toolName: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  affiliateUrl?: string | null;
  rating: number; // 0-5 scale (avg_rating)
  ratingCount: number;
  bestFor?: string | null;
  pros?: string[] | null;
  cons?: string[] | null;
  summary?: string | null;
  isRecommended?: boolean;
  className?: string;
}

/**
 * "Quick Verdict" card for the Tool Detail page itself — sits right under
 * the header so a reader can decide in ~5 seconds without scrolling through
 * the full article. Mirrors the blog VerdictBox pattern but is driven by
 * the tool's own aggregate rating + AI-score pros/cons instead of a
 * hand-written review's verdict_* fields.
 */
export function QuickVerdictCard({
  toolName,
  logoUrl,
  websiteUrl,
  affiliateUrl,
  rating,
  ratingCount,
  bestFor,
  pros,
  cons,
  summary,
  isRecommended,
  className,
}: QuickVerdictCardProps) {
  const { t } = useI18n();
  const logo = getToolLogoUrl(logoUrl, websiteUrl);
  const ctaUrl = affiliateUrl || websiteUrl;
  const roundedRating = Math.round(rating * 2) / 2;
  const hasProsAndCons = (pros && pros.length > 0) || (cons && cons.length > 0);

  if (ratingCount === 0 && !summary && !hasProsAndCons) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-start">
        {/* Identity + rating + CTA */}
        <div className="flex items-center gap-4 md:w-56 md:shrink-0 md:flex-col md:items-start md:border-r md:border-border md:pr-5">
          <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-2">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-xl font-bold text-muted-foreground">
              {logo ? (
                <img src={logo} alt={toolName} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                toolName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-primary">
                <Sparkles className="h-3 w-3" />
                {t("verdict.quickBadge", "Đánh giá nhanh")}
              </p>
              <span className="font-heading text-lg font-bold text-foreground">{toolName}</span>
            </div>
          </div>

          {ratingCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => {
                  const filled = i + 1 <= Math.floor(roundedRating);
                  const half = !filled && i + 0.5 === roundedRating;
                  return (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        filled || half ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
                      )}
                    />
                  );
                })}
              </div>
              <span className="text-sm font-bold text-foreground">{roundedRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                /5 ({ratingCount} {t("tool.ratings", "đánh giá")})
              </span>
            </div>
          )}

          {bestFor && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t("verdict.bestFor", "Phù hợp cho")}:</span> {bestFor}
            </p>
          )}

          {ctaUrl && (
            <Button asChild size="sm" className="mt-1 w-full gap-1.5 md:mt-2">
              <a href={ctaUrl} target="_blank" rel="noopener noreferrer sponsored">
                {t("verdict.tryNow", "Dùng thử miễn phí")}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>

        {/* Summary + pros/cons */}
        <div className="flex-1 space-y-4">
          {summary && <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>}

          {isRecommended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> {t("verdict.aiRecommended", "Được AI đề xuất")}
            </span>
          )}

          {hasProsAndCons && (
            <div className="grid gap-4 sm:grid-cols-2">
              {pros && pros.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-success">
                    {t("tool.pros", "Ưu điểm")}
                  </p>
                  <ul className="space-y-1">
                    {pros.slice(0, 4).map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-foreground/90">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {cons && cons.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
                    {t("tool.cons", "Nhược điểm")}
                  </p>
                  <ul className="space-y-1">
                    {cons.slice(0, 4).map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-foreground/90">
                        <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
