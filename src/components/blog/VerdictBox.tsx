import { Star, Check, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getToolLogoUrl } from "@/lib/favicon";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface VerdictBoxTool {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  website_url?: string | null;
  affiliate_url?: string | null;
}

interface VerdictBoxProps {
  tool: VerdictBoxTool;
  rating: number; // 0-5, e.g. 4.5
  summary?: string | null;
  pros?: string[] | null;
  cons?: string[] | null;
  bestFor?: string | null;
  ctaLabel?: string | null;
  className?: string;
}

/**
 * "Verdict Box" pattern for review-type articles — sits near the top of the
 * article, gives readers the TL;DR rating + pros/cons + primary CTA before
 * they read the full breakdown. Teal/cyan accented per approved design.
 */
export function VerdictBox({
  tool,
  rating,
  summary,
  pros,
  cons,
  bestFor,
  ctaLabel,
  className,
}: VerdictBoxProps) {
  const { t } = useI18n();
  const logo = getToolLogoUrl(tool.logo_url, tool.website_url);
  const affiliateUrl = tool.affiliate_url || tool.website_url;
  const roundedRating = Math.round(rating * 2) / 2;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm",
        className
      )}
    >
      <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-start">
        {/* Tool identity + rating */}
        <div className="flex items-center gap-4 md:w-56 md:shrink-0 md:flex-col md:items-start md:border-r md:border-border md:pr-5">
          <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-2">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-xl font-bold text-muted-foreground">
              {logo ? (
                <img src={logo} alt={tool.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                tool.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                {t("verdict.badge", "Our Verdict")}
              </p>
              <Link to={`/tool/${tool.slug}`} className="font-heading text-lg font-bold text-foreground hover:text-primary transition-colors">
                {tool.name}
              </Link>
            </div>
          </div>

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
            <span className="text-xs text-muted-foreground">/5</span>
          </div>

          {bestFor && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t("verdict.bestFor", "Best for")}:</span> {bestFor}
            </p>
          )}

          {affiliateUrl && (
            <Button asChild size="sm" className="mt-1 w-full gap-1.5 md:mt-2">
              <a href={affiliateUrl} target="_blank" rel="noopener noreferrer sponsored">
                {ctaLabel || t("verdict.tryNow", "Try It Free")}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>

        {/* Summary + pros/cons */}
        <div className="flex-1 space-y-4">
          {summary && (
            <p className="text-sm leading-relaxed text-foreground/90">{summary}</p>
          )}

          {((pros && pros.length > 0) || (cons && cons.length > 0)) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {pros && pros.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-success">
                    {t("tool.pros", "Pros")}
                  </p>
                  <ul className="space-y-1">
                    {pros.map((p, i) => (
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
                    {t("tool.cons", "Cons")}
                  </p>
                  <ul className="space-y-1">
                    {cons.map((c, i) => (
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
