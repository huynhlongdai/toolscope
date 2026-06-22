import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mail, Sparkles, X, Gift } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

const POPUP_KEY = "toolscope_newsletter_popup";
const POPUP_DELAY_MS = 30000; // 30 seconds
const POPUP_COOLDOWN_DAYS = 7;

export function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    // Check if already dismissed or subscribed
    const stored = localStorage.getItem(POPUP_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.subscribed) return;
      if (data.dismissed) {
        const dismissedAt = new Date(data.dismissed).getTime();
        if (Date.now() - dismissedAt < POPUP_COOLDOWN_DAYS * 86400000) return;
      }
    }

    // Show popup after delay + scroll threshold
    let shown = false;
    const timer = setTimeout(() => {
      const onScroll = () => {
        const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
        if (scrollPercent > 0.3 && !shown) {
          shown = true;
          setOpen(true);
          window.removeEventListener("scroll", onScroll);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      // Also trigger if no scroll after additional 30s
      setTimeout(() => {
        if (!shown) { shown = true; setOpen(true); }
        window.removeEventListener("scroll", onScroll);
      }, 30000);
    }, POPUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setOpen(false);
    localStorage.setItem(POPUP_KEY, JSON.stringify({ dismissed: new Date().toISOString() }));
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    setLoading(false);
    if (error) {
      if (error.code === "23505") {
        toast.info(t("newsletter.alreadySubscribed"));
        localStorage.setItem(POPUP_KEY, JSON.stringify({ subscribed: true }));
        setOpen(false);
      } else {
        toast.error(t("newsletter.error"));
      }
    } else {
      toast.success(t("newsletter.success"));
      localStorage.setItem(POPUP_KEY, JSON.stringify({ subscribed: true }));
      setOpen(false);
      setEmail("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20">
            <Gift className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {t("newsletter.popupTitle") || "Đừng bỏ lỡ deals hot! 🔥"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {t("newsletter.popupSubtitle") || "Nhận thông báo về tools mới, ưu đãi độc quyền và tips hàng tuần."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubscribe} className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder={t("newsletter.placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
            <Button type="submit" disabled={loading} className="h-11 rounded-xl px-5 shrink-0">
              <Mail className="h-4 w-4 mr-1.5" />
              {t("newsletter.subscribe")}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>{t("newsletter.popupBenefit") || "1000+ người đã đăng ký · Hủy bất cứ lúc nào"}</span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
