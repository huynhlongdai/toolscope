import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToolLogoUrl } from "@/lib/favicon";
import { useI18n } from "@/lib/i18n";

interface StickyMobileCTAProps {
  toolName: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  affiliateUrl?: string | null;
  rating?: number | null;
}

/**
 * Bottom sticky CTA bar — mobile only. Appears once the reader scrolls
 * past the page header (where the primary CTA button lives) so the
 * affiliate link is always one tap away, no matter how far down a long
 * review/article they've scrolled.
 */
export function StickyMobileCTA({ toolName, logoUrl, websiteUrl, affiliateUrl, rating }: StickyMobileCTAProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const logo = getToolLogoUrl(logoUrl, websiteUrl);
  const ctaUrl = affiliateUrl || websiteUrl;

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!ctaUrl) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-14 z-40 border-t border-border bg-card/95 px-3 py-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-sm font-bold text-muted-foreground">
          {logo ? (
            <img src={logo} alt={toolName} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            toolName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{toolName}</p>
          {rating != null && rating > 0 && (
            <p className="text-[11px] text-muted-foreground">⭐ {rating.toFixed(1)}/5</p>
          )}
        </div>
        <Button asChild size="sm" className="shrink-0 gap-1.5">
          <a href={ctaUrl} target="_blank" rel="noopener noreferrer sponsored">
            {t("verdict.tryNow", "Dùng thử")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
