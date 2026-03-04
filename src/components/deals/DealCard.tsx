import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Check, ExternalLink, Clock, Shield, Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Deal {
  id: string;
  tool_id: string;
  title: string;
  description?: string | null;
  coupon_code?: string | null;
  discount_type: string;
  discount_value?: number | null;
  deal_url?: string | null;
  original_price?: number | null;
  deal_price?: number | null;
  currency: string;
  starts_at?: string | null;
  expires_at?: string | null;
  is_verified: boolean;
  is_exclusive: boolean;
  is_active: boolean;
  click_count: number;
}

function useCountdown(expiresAt: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Hết hạn"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`);
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return timeLeft;
}

export function DealCard({ deal, toolName }: { deal: Deal; toolName?: string }) {
  const [copied, setCopied] = useState(false);
  const countdown = useCountdown(deal.expires_at);

  const copyCode = async () => {
    if (!deal.coupon_code) return;
    await navigator.clipboard.writeText(deal.coupon_code);
    setCopied(true);
    toast.success("Đã copy mã giảm giá!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClick = async () => {
    // Increment click count
    await supabase.rpc("increment_deal_click", { deal_id: deal.id }).catch(() => {});
  };

  const discountLabel = deal.discount_type === "percentage" && deal.discount_value
    ? `-${deal.discount_value}%`
    : deal.discount_type === "fixed" && deal.discount_value
    ? `-${deal.discount_value} ${deal.currency}`
    : deal.discount_type === "free_trial"
    ? "Dùng thử miễn phí"
    : null;

  const isExpiringSoon = deal.expires_at && new Date(deal.expires_at).getTime() - Date.now() < 3 * 86400000;

  return (
    <Card className={cn(
      "overflow-hidden transition-all hover:shadow-md",
      deal.is_exclusive && "border-primary/40 bg-primary/[0.02]",
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {discountLabel && (
            <Badge className="bg-red-500/90 text-white hover:bg-red-500">
              <Tag className="h-3 w-3 mr-1" /> {discountLabel}
            </Badge>
          )}
          {deal.is_exclusive && (
            <Badge variant="outline" className="border-primary/50 text-primary">
              <Sparkles className="h-3 w-3 mr-1" /> Độc quyền
            </Badge>
          )}
          {deal.is_verified && (
            <Badge variant="secondary">
              <Shield className="h-3 w-3 mr-1" /> Đã xác minh
            </Badge>
          )}
          {isExpiringSoon && countdown && countdown !== "Hết hạn" && (
            <Badge variant="destructive" className="animate-pulse">
              <Clock className="h-3 w-3 mr-1" /> {countdown}
            </Badge>
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h4 className="font-semibold text-sm">{deal.title}</h4>
          {deal.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{deal.description}</p>
          )}
        </div>

        {/* Pricing */}
        {(deal.original_price != null || deal.deal_price != null) && (
          <div className="flex items-baseline gap-2">
            {deal.original_price != null && (
              <span className="text-sm text-muted-foreground line-through">
                {deal.original_price} {deal.currency}
              </span>
            )}
            {deal.deal_price != null && (
              <span className="text-lg font-bold text-primary">
                {deal.deal_price} {deal.currency}
              </span>
            )}
          </div>
        )}

        {/* Coupon Code */}
        {deal.coupon_code && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={copyCode}
                className={cn(
                  "w-full flex items-center justify-between rounded-lg border-2 border-dashed px-3 py-2 text-sm font-mono transition-colors",
                  copied
                    ? "border-green-500 bg-green-500/10 text-green-600"
                    : "border-primary/30 bg-primary/5 text-foreground hover:border-primary/60"
                )}
              >
                <span>{deal.coupon_code}</span>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>Click để copy mã</TooltipContent>
          </Tooltip>
        )}

        {/* CTA */}
        {deal.deal_url && (
          <Button asChild size="sm" className="w-full gap-2" onClick={handleClick}>
            <a href={deal.deal_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Nhận ưu đãi
            </a>
          </Button>
        )}

        {/* Expiry info */}
        {deal.expires_at && !isExpiringSoon && countdown && (
          <p className="text-[11px] text-muted-foreground text-center">
            <Clock className="inline h-3 w-3 mr-1" /> Còn {countdown}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
