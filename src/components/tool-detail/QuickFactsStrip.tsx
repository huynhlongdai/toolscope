import { DollarSign, Gift, Monitor, ShieldCheck, ShieldOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface QuickFactsStripProps {
  pricingType?: string | null;
  hasFreeTrial?: boolean | null;
  trialDays?: number | null;
  requiresCard?: boolean | null;
  platforms?: string[] | null;
  className?: string;
}

/**
 * Compact "at a glance" facts strip — surfaces data that already exists in
 * the `tools` row (has_free_trial, trial_days, requires_card, platforms)
 * but previously had no UI anywhere on the Tool Detail page. These are
 * exactly the objections/questions a buyer has before clicking the
 * affiliate CTA, so putting them right under the fold reduces friction.
 */
export function QuickFactsStrip({
  pricingType,
  hasFreeTrial,
  trialDays,
  requiresCard,
  platforms,
  className,
}: QuickFactsStripProps) {
  const { t } = useI18n();

  const pricingLabel = (type?: string | null) => {
    if (!type) return null;
    return t(`pricing.${type}`, type);
  };

  const facts: { icon: React.ReactNode; label: string; value: string }[] = [];

  if (pricingType) {
    facts.push({
      icon: <DollarSign className="h-4 w-4 text-primary" />,
      label: t("quickFacts.pricing", "Giá"),
      value: pricingLabel(pricingType) || pricingType,
    });
  }

  if (hasFreeTrial) {
    facts.push({
      icon: <Gift className="h-4 w-4 text-success" />,
      label: t("quickFacts.trial", "Free trial"),
      value: trialDays ? `${trialDays} ${t("quickFacts.days", "ngày")}` : t("quickFacts.yes", "Có"),
    });
  }

  if (requiresCard != null) {
    facts.push({
      icon: requiresCard ? (
        <ShieldCheck className="h-4 w-4 text-amber-500" />
      ) : (
        <ShieldOff className="h-4 w-4 text-success" />
      ),
      label: t("quickFacts.card", "Yêu cầu thẻ"),
      value: requiresCard ? t("quickFacts.yes", "Có") : t("quickFacts.no", "Không"),
    });
  }

  if (platforms && platforms.length > 0) {
    facts.push({
      icon: <Monitor className="h-4 w-4 text-blue-500" />,
      label: t("quickFacts.platforms", "Nền tảng"),
      value: platforms.slice(0, 3).join(", ") + (platforms.length > 3 ? ` +${platforms.length - 3}` : ""),
    });
  }

  if (facts.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {facts.map((fact, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            {fact.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{fact.label}</p>
            <p className="truncate text-sm font-semibold text-foreground">{fact.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
