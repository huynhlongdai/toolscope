import { Info } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface AffiliateDisclosureProps {
  className?: string;
}

/**
 * Compact legal disclosure banner shown on any article containing
 * affiliate links (reviews, listicles, case studies, comparisons).
 * Required for FTC / consumer-protection compliance.
 */
export function AffiliateDisclosure({ className }: AffiliateDisclosureProps) {
  const { t } = useI18n();

  return (
    <div
      role="note"
      className={`flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground ${className ?? ""}`}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <p>{t("affiliate.disclosure", "This article contains affiliate links. If you buy through them, we may earn a commission at no extra cost to you. This helps fund our independent testing and reviews.")}</p>
    </div>
  );
}
