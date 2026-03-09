import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Check } from "lucide-react";
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
}

export function PricingPlansCard({ pricingDetails, pricingType }: PricingPlansCardProps) {
  const { t } = useI18n();

  const plans: PricingPlan[] = Array.isArray(pricingDetails) ? pricingDetails : [];
  if (plans.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" /> {t("tool.pricing", "Bảng giá")}
          {pricingType && (
            <Badge variant="outline" className="ml-2 text-xs font-normal">{pricingType}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative rounded-lg border p-4 transition-shadow hover:shadow-md ${
                plan.is_popular ? "border-primary ring-1 ring-primary" : "border-border"
              }`}
            >
              {plan.is_popular && (
                <Badge className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px]">
                  Popular
                </Badge>
              )}
              <h4 className="font-semibold text-sm">{plan.name || `Plan ${idx + 1}`}</h4>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">
                  {plan.currency || "$"}{plan.price ?? "N/A"}
                </span>
                {plan.period && (
                  <span className="text-xs text-muted-foreground">/{plan.period}</span>
                )}
              </div>
              {plan.features && plan.features.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
