import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { PageLayout } from "@/components/layout/PageLayout";
import { PreviewBanner } from "@/components/preview/PreviewBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShareButtons } from "@/components/share/ShareButtons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tag, ArrowLeft, Copy, Check, ExternalLink, Clock, Shield, Sparkles,
  ThumbsUp, ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DealCard } from "@/components/deals/DealCard";

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

export default function DealDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState<"works" | "broken" | null>(null);

  const { isAdminOrEditor, loading: roleLoading } = useAdminAuth();

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal-detail", slug, isAdminOrEditor],
    queryFn: async () => {
      let q = (supabase.from("deals") as any)
        .select("*, tools(name, slug, logo_url)")
        .eq("slug", slug!);
      if (!isAdminOrEditor) q = q.eq("is_active", true);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug && !roleLoading,
  });

  const { translated } = useTranslatedContent(
    "deal", deal?.id, ["title", "description"],
    { title: deal?.title, description: deal?.description ?? undefined }
  );

  const { data: relatedDeals = [] } = useQuery({
    queryKey: ["deal-related", deal?.tool_id, deal?.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from("deals") as any)
        .select("*, tools(name, slug, logo_url)")
        .eq("tool_id", deal!.tool_id)
        .eq("is_active", true)
        .neq("id", deal!.id)
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!deal?.tool_id,
  });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="container max-w-2xl py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-40 rounded-xl mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </PageLayout>
    );
  }

  if (!deal) {
    return (
      <PageLayout>
        <div className="container py-16 text-center">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-xl text-muted-foreground">{t("deals.notFound")}</p>
          <Link to="/deals" className="mt-4 inline-block text-primary hover:underline">
            ← {t("deals.backToDeals")}
          </Link>
        </div>
      </PageLayout>
    );
  }

  const displayTitle = translated.title || deal.title;
  const displayDesc = translated.description || deal.description;
  const toolName = deal.tools?.name;
  const toolSlug = deal.tools?.slug;

  const discountLabel = deal.discount_type === "percentage" && deal.discount_value
    ? `-${deal.discount_value}%`
    : deal.discount_type === "fixed" && deal.discount_value
    ? `-${deal.discount_value} ${deal.currency}`
    : deal.discount_type === "free_trial"
    ? t("deals.freeTrial")
    : deal.savings_percent != null
    ? `-${deal.savings_percent}%`
    : null;

  const dealTypeLabel = deal.deal_type && DEAL_TYPE_I18N_KEY[deal.deal_type] ? t(DEAL_TYPE_I18N_KEY[deal.deal_type]) : null;
  const redemptionLabel = deal.redemption_type && REDEMPTION_TYPE_I18N_KEY[deal.redemption_type]
    ? t(REDEMPTION_TYPE_I18N_KEY[deal.redemption_type])
    : null;
  const showCouponCode = !!deal.coupon_code && deal.redemption_type !== "manual_contact";
  const usageLimitReached = deal.usage_limit != null && (deal.current_uses ?? 0) >= deal.usage_limit;
  const isExpired = deal.expires_at && new Date(deal.expires_at).getTime() < Date.now();

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

  const handleClickDeal = async () => {
    try { await supabase.rpc("increment_deal_click" as any, { deal_id: deal.id }); } catch { /* ignore */ }
  };

  const seoTitle = `${displayTitle}${toolName ? ` - ${toolName}` : ""} - Astute Tools`;
  const seoDesc = displayDesc || `${displayTitle}${toolName ? ` cho ${toolName}` : ""}`;
  const canonicalUrl = typeof window !== "undefined" ? `${window.location.origin}/deals/${deal.slug}` : undefined;

  return (
    <PageLayout title={seoTitle} description={seoDesc} canonical={canonicalUrl} ogImage={deal.banner_image_url ?? undefined}>
      {!deal.is_active && <PreviewBanner status="inactive" />}
      <article className="container max-w-2xl py-8">
        <Link to="/deals" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("deals.backToDeals")}
        </Link>

        {deal.banner_image_url && (
          <div className="mb-6 aspect-[3/1] overflow-hidden rounded-xl bg-muted">
            <img src={deal.banner_image_url} alt={displayTitle} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="flex items-start gap-3">
          {deal.tools?.logo_url && (
            <img src={deal.tools.logo_url} alt="" className="h-10 w-10 rounded-md object-contain flex-shrink-0" />
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {displayTitle}
            </h1>
            {toolName && (
              <p className="text-sm text-muted-foreground mt-1">
                {t("deals.offerFor")}{" "}
                {toolSlug ? (
                  <Link to={`/tool/${toolSlug}`} className="font-medium text-foreground hover:text-primary hover:underline">{toolName}</Link>
                ) : (
                  <span className="font-medium text-foreground">{toolName}</span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {discountLabel && (
            <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Tag className="h-3 w-3 mr-1" /> {discountLabel}
            </Badge>
          )}
          {dealTypeLabel && <Badge variant="outline" className="text-[11px]">{dealTypeLabel}</Badge>}
          {deal.is_exclusive && (
            <Badge variant="outline" className="border-primary/50 text-primary">
              <Sparkles className="h-3 w-3 mr-1" /> {t("deals.exclusive")}
            </Badge>
          )}
          {deal.is_verified && (
            <Badge variant="secondary"><Shield className="h-3 w-3 mr-1" /> {t("deals.verified")}</Badge>
          )}
          {isExpired && <Badge variant="destructive">{t("deals.expired")}</Badge>}
          {usageLimitReached && <Badge variant="destructive">{t("deals.usageLimitReached")}</Badge>}
        </div>

        {displayDesc && <p className="mt-4 text-muted-foreground leading-relaxed">{displayDesc}</p>}

        {(deal.original_price != null || deal.deal_price != null) && (
          <div className="mt-6 flex items-baseline gap-3 p-4 rounded-lg bg-muted/50">
            {deal.original_price != null && (
              <span className="text-base text-muted-foreground line-through">{deal.original_price} {deal.currency}</span>
            )}
            {deal.deal_price != null && (
              <span className="text-3xl font-bold text-primary">{deal.deal_price} {deal.currency}</span>
            )}
          </div>
        )}

        {redemptionLabel && <p className="mt-3 text-sm text-muted-foreground">{redemptionLabel}</p>}

        {showCouponCode && (
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("deals.couponCode")}</p>
            <button
              onClick={copyCode}
              className={cn(
                "w-full flex items-center justify-between rounded-lg border-2 border-dashed px-4 py-3 text-base font-mono transition-colors",
                copied ? "border-primary bg-primary/10 text-primary" : "border-primary/30 bg-primary/5 text-foreground hover:border-primary/60"
              )}
            >
              <span className="tracking-wider">{deal.coupon_code}</span>
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        )}

        {deal.usage_limit != null && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("deals.usageLimit")}: {deal.current_uses ?? 0}/{deal.usage_limit} {t("deals.usesRemaining")}
          </p>
        )}

        {deal.terms_conditions && (
          <details className="mt-4 text-sm text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">{t("deals.termsConditions")}</summary>
            <p className="mt-2 whitespace-pre-line">{deal.terms_conditions}</p>
          </details>
        )}

        {deal.eligibility && Object.keys(deal.eligibility).length > 0 && (
          <div className="mt-4 text-sm">
            <p className="font-medium">{t("deals.eligibility")}</p>
            <ul className="mt-1 text-muted-foreground space-y-0.5">
              {Object.entries(deal.eligibility as Record<string, unknown>).map(([k, v]) => (
                <li key={k} className="flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span> {k}: {String(v)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {deal.last_verified_at && (
          <p className="mt-4 text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {t("deals.lastVerified")}: {new Date(deal.last_verified_at).toLocaleDateString()}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          {deal.deal_url && (
            <Button asChild className="w-full sm:w-auto gap-2" onClick={handleClickDeal}>
              <a href={deal.deal_url} target="_blank" rel="noopener noreferrer sponsored">
                <ExternalLink className="h-4 w-4" /> {t("deals.getCoupon")}
              </a>
            </Button>
          )}
          <ShareButtons url={canonicalUrl ?? ""} title={`${displayTitle}${toolName ? ` - ${toolName}` : ""}`} />
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 pt-3 border-t text-sm">
          <button
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-muted transition-colors", verified === "works" && "text-green-600")}
            onClick={() => handleVerify(true)}
            disabled={verified !== null}
          >
            <ThumbsUp className="h-4 w-4" /> {t("deals.verifyStillWorks")}
          </button>
          <button
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-muted transition-colors", verified === "broken" && "text-destructive")}
            onClick={() => handleVerify(false)}
            disabled={verified !== null}
          >
            <ThumbsDown className="h-4 w-4" /> {t("deals.verifyReportBroken")}
          </button>
        </div>

        {relatedDeals.length > 0 && (
          <div className="mt-12 border-t pt-8">
            <h2 className="text-xl font-bold mb-4">{t("deals.relatedDeals")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedDeals.map((rd: any) => (
                <DealCard
                  key={rd.id}
                  deal={rd}
                  toolName={rd.tools?.name}
                  toolSlug={rd.tools?.slug}
                  toolLogoUrl={rd.tools?.logo_url}
                />
              ))}
            </div>
          </div>
        )}
      </article>
    </PageLayout>
  );
}
