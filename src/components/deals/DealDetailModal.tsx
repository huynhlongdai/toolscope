import { useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Clock, Shield, Sparkles, Tag, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

const DEAL_TYPE_I18N_KEY: Record<string, string> = {
  coupon_code: "deals.type.coupon_code",
  lifetime_deal: "deals.type.lifetime_deal",
  free_trial_extended: "deals.type.free_trial_extended",
  student_discount: "deals.type.student_discount",
  referral: "deals.type.referral",
  bundle: "deals.type.bundle",
  flash_sale: "deals.type.flash_sale",
  no_code_auto: "deals.type.no_code_auto",
};

const REDEMPTION_TYPE_I18N_KEY: Record<string, string> = {
  code: "deals.redemption.code",
  auto_apply: "deals.redemption.auto_apply",
  manual_contact: "deals.redemption.manual_contact",
};

interface Deal {
  id: string;
  title: string;
  description?: string | null;
  coupon_code?: string | null;
  discount_type: string;
  discount_value?: number | null;
  deal_url?: string | null;
  original_price?: number | null;
  deal_price?: number | null;
  currency: string;
  expires_at?: string | null;
  is_verified: boolean;
  is_exclusive: boolean;
  slug?: string;
  deal_type?: string;
  redemption_type?: string;
  savings_percent?: number | null;
  usage_limit?: number | null;
  current_uses?: number | null;
  last_verified_at?: string | null;
  eligibility?: Record<string, unknown> | null;
  terms_conditions?: string | null;
  banner_image_url?: string | null;
}

interface DealDetailModalProps {
  deal: Deal;
  toolName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countdown?: string;
  onClickDeal?: () => void;
}

export function DealDetailModal({ deal, toolName, open, onOpenChange, countdown, onClickDeal }: DealDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState<"works" | "broken" | null>(null);
  const { t } = useI18n();

  const copyCode = async () => {
    if (!deal.coupon_code) return;
    await navigator.clipboard.writeText(deal.coupon_code);
    setCopied(true);
    toast.success(t("deals.copiedCode"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async (stillWorks: boolean) => {
    try {
      await supabase.rpc("verify_deal" as any, { _deal_id: deal.id, _still_works: stillWorks });
      setVerified(stillWorks ? "works" : "broken");
      toast.success(stillWorks ? t("deals.verifyThanks") : t("deals.verifyReportedThanks"));
    } catch {
      toast.error(t("deals.verifyThanks"));
    }
  };

  const discountLabel = deal.discount_type === "percentage" && deal.discount_value
    ? `-${deal.discount_value}%`
    : deal.discount_type === "fixed" && deal.discount_value
    ? `-${deal.discount_value} ${deal.currency}`
    : deal.discount_type === "free_trial"
    ? t("deals.freeTrial")
    : deal.savings_percent != null
    ? `-${deal.savings_percent}%`
    : null;

  const isExpiringSoon = deal.expires_at && new Date(deal.expires_at).getTime() - Date.now() < 3 * 86400000;
  const usageLimitReached = deal.usage_limit != null && (deal.current_uses ?? 0) >= deal.usage_limit;
  const dealTypeLabel = deal.deal_type && DEAL_TYPE_I18N_KEY[deal.deal_type] ? t(DEAL_TYPE_I18N_KEY[deal.deal_type]) : null;
  const redemptionLabel = deal.redemption_type && REDEMPTION_TYPE_I18N_KEY[deal.redemption_type]
    ? t(REDEMPTION_TYPE_I18N_KEY[deal.redemption_type])
    : null;
  // Only show the fake "copy code" affordance when there really is a code
  // to type in - deals with redemption_type = auto_apply/manual_contact
  // (common for pure affiliate-link "deals") never had a real code, so the
  // old UI's coupon_code-only check was misleading for those.
  const showCouponCode = !!deal.coupon_code && deal.redemption_type !== "manual_contact";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Tag className="h-5 w-5 text-primary" />
            {deal.title}
          </DialogTitle>
          {toolName && (
            <DialogDescription className="text-sm">
              {t("deals.offerFor")} <span className="font-medium text-foreground">{toolName}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {discountLabel && (
              <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                <Tag className="h-3 w-3 mr-1" /> {discountLabel}
              </Badge>
            )}
            {dealTypeLabel && (
              <Badge variant="outline" className="text-[11px]">{dealTypeLabel}</Badge>
            )}
            {deal.is_exclusive && (
              <Badge variant="outline" className="border-primary/50 text-primary">
                <Sparkles className="h-3 w-3 mr-1" /> {t("deals.exclusive")}
              </Badge>
            )}
            {deal.is_verified && (
              <Badge variant="secondary">
                <Shield className="h-3 w-3 mr-1" /> {t("deals.verified")}
              </Badge>
            )}
            {isExpiringSoon && countdown && countdown !== "Hết hạn" && (
              <Badge variant="destructive" className="animate-pulse">
                <Clock className="h-3 w-3 mr-1" /> {countdown}
              </Badge>
            )}
            {usageLimitReached && (
              <Badge variant="destructive">{t("deals.usageLimitReached")}</Badge>
            )}
          </div>

          {deal.description && (
            <p className="text-sm text-muted-foreground">{deal.description}</p>
          )}

          {(deal.original_price != null || deal.deal_price != null) && (
            <div className="flex items-baseline gap-3 p-3 rounded-lg bg-muted/50">
              {deal.original_price != null && (
                <span className="text-sm text-muted-foreground line-through">
                  {deal.original_price} {deal.currency}
                </span>
              )}
              {deal.deal_price != null && (
                <span className="text-2xl font-bold text-primary">
                  {deal.deal_price} {deal.currency}
                </span>
              )}
            </div>
          )}

          {redemptionLabel && (
            <p className="text-xs text-muted-foreground">{redemptionLabel}</p>
          )}

          {showCouponCode && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("deals.couponCode")}</p>
              <button
                onClick={copyCode}
                className={cn(
                  "w-full flex items-center justify-between rounded-lg border-2 border-dashed px-4 py-3 text-base font-mono transition-colors",
                  copied
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-primary/30 bg-primary/5 text-foreground hover:border-primary/60"
                )}
              >
                <span className="tracking-wider">{deal.coupon_code}</span>
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
          )}

          {deal.usage_limit != null && (
            <p className="text-xs text-muted-foreground">
              {t("deals.usageLimit")}: {deal.current_uses ?? 0}/{deal.usage_limit} {t("deals.usesRemaining")}
            </p>
          )}

          {deal.terms_conditions && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium">{t("deals.termsConditions")}</summary>
              <p className="mt-1 whitespace-pre-line">{deal.terms_conditions}</p>
            </details>
          )}

          {deal.expires_at && countdown && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {t("deals.remaining")} {countdown}
            </p>
          )}

          {deal.last_verified_at && (
            <p className="text-[11px] text-muted-foreground">
              {t("deals.lastVerified")}: {new Date(deal.last_verified_at).toLocaleDateString()}
            </p>
          )}

          {deal.deal_url && (
            <Button asChild className="w-full gap-2" onClick={() => onClickDeal?.()}>
              <a href={deal.deal_url} target="_blank" rel="noopener noreferrer sponsored">
                <ExternalLink className="h-4 w-4" /> {t("deals.getCoupon")}
              </a>
            </Button>
          )}

          {/* Community verify - "still works" / "report broken" signal,
              separate from the static is_verified admin flag. */}
          <div className="flex items-center justify-center gap-3 pt-1 border-t text-xs">
            <button
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors",
                verified === "works" && "text-green-600"
              )}
              onClick={() => handleVerify(true)}
              disabled={verified !== null}
            >
              <ThumbsUp className="h-3.5 w-3.5" /> {t("deals.verifyStillWorks")}
            </button>
            <button
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors",
                verified === "broken" && "text-destructive"
              )}
              onClick={() => handleVerify(false)}
              disabled={verified !== null}
            >
              <ThumbsDown className="h-3.5 w-3.5" /> {t("deals.verifyReportBroken")}
            </button>
          </div>

          {deal.slug && (
            <Link
              to={`/deals/${deal.slug}`}
              className="block text-center text-xs text-muted-foreground hover:text-primary hover:underline"
              onClick={() => onOpenChange(false)}
            >
              {t("deals.viewFullDetail")}
            </Link>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
