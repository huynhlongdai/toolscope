import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShareButtons } from "@/components/share/ShareButtons";
import { Tag, ThumbsUp, ThumbsDown, Sparkles, Shield, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DealDetailModal } from "./DealDetailModal";

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
  upvotes: number;
  downvotes: number;
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

export function DealCard({ deal, toolName, toolSlug }: { deal: Deal; toolName?: string; toolSlug?: string }) {
  const { user } = useAuth();
  const countdown = useCountdown(deal.expires_at);
  const [localUpvotes, setLocalUpvotes] = useState(deal.upvotes ?? 0);
  const [localDownvotes, setLocalDownvotes] = useState(deal.downvotes ?? 0);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("votes")
      .select("vote")
      .eq("target_type", "deal")
      .eq("target_id", deal.id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setUserVote(data.vote as "up" | "down");
      });
  }, [user, deal.id]);

  const handleVote = async (voteType: "up" | "down") => {
    if (!user) { toast.error("Vui lòng đăng nhập để bình chọn"); return; }

    if (userVote === voteType) {
      setUserVote(null);
      if (voteType === "up") setLocalUpvotes(v => v - 1);
      else setLocalDownvotes(v => v - 1);
      await supabase.from("votes").delete().eq("target_type", "deal").eq("target_id", deal.id).eq("user_id", user.id);
      await (supabase.from("deals") as any).update({
        [voteType === "up" ? "upvotes" : "downvotes"]: voteType === "up" ? localUpvotes - 1 : localDownvotes - 1,
      }).eq("id", deal.id);
    } else {
      if (userVote) {
        if (userVote === "up") setLocalUpvotes(v => v - 1);
        else setLocalDownvotes(v => v - 1);
        await supabase.from("votes").delete().eq("target_type", "deal").eq("target_id", deal.id).eq("user_id", user.id);
      }
      setUserVote(voteType);
      if (voteType === "up") setLocalUpvotes(v => v + 1);
      else setLocalDownvotes(v => v + 1);

      await supabase.from("votes").insert({ target_type: "deal", target_id: deal.id, user_id: user.id, vote: voteType });

      const updates: any = {};
      if (voteType === "up") {
        updates.upvotes = localUpvotes + (userVote === "up" ? 0 : 1);
        if (userVote === "down") updates.downvotes = localDownvotes - 1;
      } else {
        updates.downvotes = localDownvotes + (userVote === "down" ? 0 : 1);
        if (userVote === "up") updates.upvotes = localUpvotes - 1;
      }
      await (supabase.from("deals") as any).update(updates).eq("id", deal.id);
    }
  };

  const handleClickDeal = async () => {
    try { await supabase.rpc("increment_deal_click" as any, { deal_id: deal.id }); } catch {}
  };

  const discountLabel = deal.discount_type === "percentage" && deal.discount_value
    ? `-${deal.discount_value}%`
    : deal.discount_type === "fixed" && deal.discount_value
    ? `-${deal.discount_value} ${deal.currency}`
    : deal.discount_type === "free_trial"
    ? "Dùng thử miễn phí"
    : null;

  const isExpiringSoon = deal.expires_at && new Date(deal.expires_at).getTime() - Date.now() < 3 * 86400000;
  const shareUrl = toolSlug ? `${window.location.origin}/tool/${toolSlug}` : window.location.href;

  return (
    <>
      <Card
        className={cn(
          "overflow-hidden transition-all hover:shadow-md cursor-pointer",
          deal.is_exclusive && "border-primary/40 bg-primary/[0.02]",
        )}
        onClick={() => setModalOpen(true)}
      >
        <CardContent className="p-4 space-y-3">
          {/* Badges */}
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

          {/* Voting + Share row */}
          <div className="flex items-center justify-between pt-1 border-t" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-7 px-2 gap-1 text-xs", userVote === "up" && "text-primary bg-primary/10")}
                onClick={() => handleVote("up")}
              >
                <ThumbsUp className="h-3.5 w-3.5" /> {localUpvotes}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-7 px-2 gap-1 text-xs", userVote === "down" && "text-destructive bg-destructive/10")}
                onClick={() => handleVote("down")}
              >
                <ThumbsDown className="h-3.5 w-3.5" /> {localDownvotes}
              </Button>
            </div>
            <ShareButtons url={shareUrl} title={`${deal.title}${toolName ? ` - ${toolName}` : ""}`} />
          </div>

          {/* Expiry info */}
          {deal.expires_at && !isExpiringSoon && countdown && (
            <p className="text-[11px] text-muted-foreground text-center">
              <Clock className="inline h-3 w-3 mr-1" /> Còn {countdown}
            </p>
          )}
        </CardContent>
      </Card>

      <DealDetailModal
        deal={deal}
        toolName={toolName}
        open={modalOpen}
        onOpenChange={setModalOpen}
        countdown={countdown}
        onClickDeal={handleClickDeal}
      />
    </>
  );
}
