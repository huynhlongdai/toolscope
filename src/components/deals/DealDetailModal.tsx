import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Clock, Shield, Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();

  const copyCode = async () => {
    if (!deal.coupon_code) return;
    await navigator.clipboard.writeText(deal.coupon_code);
    setCopied(true);
    toast.success("Đã copy mã giảm giá!");
    setTimeout(() => setCopied(false), 2000);
  };

  const discountLabel = deal.discount_type === "percentage" && deal.discount_value
    ? `-${deal.discount_value}%`
    : deal.discount_type === "fixed" && deal.discount_value
    ? `-${deal.discount_value} ${deal.currency}`
    : deal.discount_type === "free_trial"
    ? t("deals.freeTrial")
    : null;

  const isExpiringSoon = deal.expires_at && new Date(deal.expires_at).getTime() - Date.now() < 3 * 86400000;

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
              Ưu đãi cho <span className="font-medium text-foreground">{toolName}</span>
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

          {deal.coupon_code && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Mã giảm giá</p>
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

          {deal.expires_at && countdown && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Còn {countdown}
            </p>
          )}

          {deal.deal_url && (
            <Button asChild className="w-full gap-2" onClick={() => onClickDeal?.()}>
              <a href={deal.deal_url} target="_blank" rel="noopener noreferrer sponsored">
                <ExternalLink className="h-4 w-4" /> Nhận ưu đãi
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
