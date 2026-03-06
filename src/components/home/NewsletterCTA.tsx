import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.info(t("newsletter.alreadySubscribed"));
      else toast.error(t("newsletter.error"));
    } else {
      toast.success(t("newsletter.success"));
      setEmail("");
    }
  };

  return (
    <section className="py-10 md:py-12 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10" aria-label={t("newsletter.title")}>
      <div className="container text-center">
        <div className="mx-auto max-w-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            {t("newsletter.badge")}
          </div>
          <h2 className="text-2xl font-bold md:text-3xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t("newsletter.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("newsletter.subtitle")}</p>
          <form onSubmit={handleSubscribe} className="mx-auto mt-4 flex max-w-sm gap-2">
            <Input type="email" placeholder={t("newsletter.placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" required />
            <Button type="submit" disabled={loading} className="h-11 rounded-xl px-5 shrink-0">
              <Mail className="h-4 w-4 mr-1.5" />
              {t("newsletter.subscribe")}
            </Button>
          </form>
          <p className="mt-3 text-[11px] text-muted-foreground">{t("newsletter.noSpam")}</p>
        </div>
      </div>
    </section>
  );
}
