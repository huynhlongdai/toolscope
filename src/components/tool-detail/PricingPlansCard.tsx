import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check, Gift, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";

interface PricingPlan {
  name?: string;
  price?: string | number;
  currency?: string;
  period?: string;
  features?: string[];
  is_popular?: boolean;
}

interface PricingPlansCardProps {
  pricingDetails: unknown;
  pricingType?: string;
  toolName?: string;
}

export function PricingPlansCard({ pricingDetails, pricingType, toolName }: PricingPlansCardProps) {
  const { t } = useI18n();

  const plans: PricingPlan[] = Array.isArray(pricingDetails) ? pricingDetails : [];

  const isFree = (plan: PricingPlan) =>
    plan.price === 0 || plan.price === "0" || String(plan.price).toLowerCase() === "free";

  // JSON-LD structured data for SEO/AI
  useEffect(() => {
    if (!toolName || plans.length === 0) return;

    const offers = plans.map((plan) => ({
      "@type": "Offer",
      name: plan.name || "Plan",
      price: isFree(plan) ? "0" : String(plan.price ?? ""),
      priceCurrency: plan.currency?.replace(/[^A-Za-z]/g, "") || "USD",
      ...(plan.period && { billingDuration: plan.period }),
      ...(plan.features && { description: plan.features.join(", ") }),
    }));

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: toolName,
      offers: offers.length === 1 ? offers[0] : offers,
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-pricing-jsonld", "true");
    script.textContent = JSON.stringify(jsonLd);
    document.querySelector('script[data-pricing-jsonld]')?.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [toolName, plans]);

  if (plans.length === 0) return null;

  return (
    <section aria-label={t("tool.pricing", "Bảng giá")} itemScope itemType="https://schema.org/Product">
      {toolName && <meta itemProp="name" content={toolName} />}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-primary" />
            {t("tool.pricing", "Bảng giá")}
            {pricingType && (
              <Badge variant="secondary" className="ml-2 text-[11px] font-medium capitalize">
                {pricingType}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" itemProp="offers" itemScope itemType="https://schema.org/AggregateOffer">
            {plans.map((plan, idx) => {
              const free = isFree(plan);
              const popular = !!plan.is_popular;

              return (
                <article
                  key={idx}
                  itemProp="offers"
                  itemScope
                  itemType="https://schema.org/Offer"
                  className={`
                    relative flex flex-col rounded-xl border p-5 transition-all duration-300
                    hover:shadow-lg hover:-translate-y-0.5
                    ${popular
                      ? "border-primary/60 bg-gradient-to-b from-primary/[0.06] to-transparent ring-1 ring-primary/30 scale-[1.02] z-10"
                      : "border-border bg-card hover:border-primary/30"
                    }
                  `}
                >
                  {/* Popular badge */}
                  {popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] px-3 py-0.5 shadow-md">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {t("tool.popular", "Phổ biến nhất")}
                    </Badge>
                  )}

                  {/* Plan name */}
                  <div className="flex items-center gap-2 mb-3">
                    {free
                      ? <Gift className="h-4 w-4 text-success shrink-0" />
                      : <CreditCard className="h-4 w-4 text-primary shrink-0" />
                    }
                    <h4 className="font-semibold text-sm text-foreground" itemProp="name">
                      {plan.name || `Plan ${idx + 1}`}
                    </h4>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1" itemProp="priceSpecification" itemScope itemType="https://schema.org/PriceSpecification">
                    {free ? (
                      <span className="text-2xl font-extrabold text-success tracking-tight">
                        {t("tool.free", "Miễn phí")}
                      </span>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground font-medium" itemProp="priceCurrency">
                          {plan.currency || "$"}
                        </span>
                        <span className="text-3xl font-extrabold text-foreground tracking-tight" itemProp="price">
                          {plan.price ?? "N/A"}
                        </span>
                      </>
                    )}
                    {plan.period && !free && (
                      <span className="text-xs text-muted-foreground ml-0.5">/{plan.period}</span>
                    )}
                  </div>

                  {/* Separator */}
                  {plan.features && plan.features.length > 0 && (
                    <>
                      <Separator className="my-3" />
                      <ul className="flex-1 space-y-2" aria-label={`${plan.name || "Plan"} features`}>
                        {plan.features.map((feature, fi) => (
                          <li key={fi} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                            <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
