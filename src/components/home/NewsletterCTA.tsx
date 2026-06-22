import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
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
    <section className="py-16 md:py-20" aria-label={t("newsletter.title")}>
      <div className="container">
        <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 p-10 md:p-14 text-center text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative z-10">
            <h2 className="text-2xl font-bold md:text-3xl tracking-tight">
              {t("newsletter.title")}
            </h2>
            <p className="mt-3 text-white/80 text-base md:text-lg max-w-xl mx-auto">
              {t("newsletter.subtitle")}
            </p>
            <form onSubmit={handleSubscribe} className="mx-auto mt-8 flex max-w-md gap-3">
              <Input
                type="email"
                placeholder={t("newsletter.placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-white/15 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30 focus-visible:border-white/40"
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="h-12 rounded-xl px-6 shrink-0 bg-white text-indigo-700 font-semibold hover:bg-white/90 shadow-sm"
              >
                {t("newsletter.subscribe")} →
              </Button>
            </form>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-white/60">
              <Rocket className="h-3.5 w-3.5" />
              {t("newsletter.noSpam")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
