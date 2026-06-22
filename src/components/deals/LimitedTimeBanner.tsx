import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Clock, X, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(""); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  return timeLeft;
}

function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-lg sm:text-xl font-bold tabular-nums">{value}</span>
      <span className="text-[9px] uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
}

function BannerCountdown({ expiresAt }: { expiresAt: string }) {
  const [parts, setParts] = useState({ d: "0", h: "0", m: "0", s: "0" });
  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) return;
      setParts({
        d: String(Math.floor(diff / 86400000)),
        h: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0"),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0"),
        s: String(Math.floor((diff % 60000) / 1000)).padStart(2, "0"),
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {parseInt(parts.d) > 0 && (
        <>
          <CountdownUnit value={parts.d} label="ngày" />
          <span className="text-lg font-bold opacity-60">:</span>
        </>
      )}
      <CountdownUnit value={parts.h} label="giờ" />
      <span className="text-lg font-bold opacity-60">:</span>
      <CountdownUnit value={parts.m} label="phút" />
      <span className="text-lg font-bold opacity-60">:</span>
      <CountdownUnit value={parts.s} label="giây" />
    </div>
  );
}

export function LimitedTimeBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: featuredDeal } = useQuery({
    queryKey: ["featured-limited-deal"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("deals")
        .select("id, title, discount_type, discount_value, currency, expires_at, tool_id, tools:tool_id(name, slug, logo_url)")
        .eq("is_active", true)
        .eq("is_exclusive", true)
        .gt("expires_at", now)
        .order("expires_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  if (dismissed || !featuredDeal || !featuredDeal.expires_at) return null;

  const tool = featuredDeal.tools as any;
  const discountLabel = featuredDeal.discount_type === "percentage" && featuredDeal.discount_value
    ? `-${featuredDeal.discount_value}%`
    : featuredDeal.discount_type === "fixed" && featuredDeal.discount_value
    ? `-${featuredDeal.discount_value} ${featuredDeal.currency}`
    : "ƯU ĐÃI";

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 text-white">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-white animate-pulse" />
        <div className="absolute right-10 top-2 h-16 w-16 rounded-full bg-white animate-pulse delay-300" />
        <div className="absolute left-1/3 -bottom-2 h-20 w-20 rounded-full bg-white animate-pulse delay-700" />
      </div>

      <div className="container relative flex flex-wrap items-center justify-between gap-3 py-2.5 sm:py-3">
        <div className="flex items-center gap-3">
          <Badge className="bg-white/20 text-white border-white/30 text-[11px] font-bold animate-bounce">
            <Sparkles className="h-3 w-3 mr-1" />
            LIMITED TIME
          </Badge>
          <div className="flex items-center gap-2">
            {tool?.logo_url && (
              <img src={tool.logo_url} alt="" className="h-6 w-6 rounded-md object-contain" />
            )}
            <span className="text-sm sm:text-base font-semibold">
              {tool?.name}: <span className="text-yellow-200">{discountLabel}</span> — {featuredDeal.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block">
            <BannerCountdown expiresAt={featuredDeal.expires_at} />
          </div>
          <Link
            to={tool?.slug ? `/tool/${tool.slug}` : "/deals"}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-rose-600 transition-transform hover:scale-105 hover:shadow-lg"
          >
            Xem ngay <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
