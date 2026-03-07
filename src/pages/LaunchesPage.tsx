import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isToday } from "date-fns";
import { vi as viLocale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ThumbsUp, Rocket, Plus, Calendar, Star, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { SEOHead } from "@/components/seo/SEOHead";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { getToolLogoUrl } from "@/lib/favicon";
import { LaunchSubmitForm } from "@/components/launches/LaunchSubmitForm";

export default function LaunchesPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [submitOpen, setSubmitOpen] = useState(false);

  const { data: launches, isLoading } = useQuery({
    queryKey: ["launches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("launches")
        .select("*, profiles:maker_id(display_name, avatar_url), tools(name, slug, logo_url, website_url, short_description, pricing_type)")
        .in("status", ["approved", "featured"])
        .order("launch_date", { ascending: false })
        .order("upvotes", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const grouped = launches?.reduce((acc, launch) => {
    const date = launch.launch_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(launch);
    return acc;
  }, {} as Record<string, typeof launches>) || {};

  const { data: userVotes } = useQuery({
    queryKey: ["launch-votes", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("votes")
        .select("target_id")
        .eq("user_id", user!.id)
        .eq("target_type", "launch")
        .eq("vote", "up");
      return new Set(data?.map((v) => v.target_id));
    },
    enabled: !!user,
  });

  const handleVote = async (launchId: string, currentUpvotes: number) => {
    if (!user) { toast.error(t("launches.loginToVote")); return; }
    const hasVoted = userVotes?.has(launchId);
    try {
      if (hasVoted) {
        await supabase.from("votes").delete().eq("target_id", launchId).eq("target_type", "launch").eq("user_id", user.id);
        await supabase.from("launches").update({ upvotes: Math.max(0, currentUpvotes - 1) }).eq("id", launchId);
      } else {
        await supabase.from("votes").insert({ target_id: launchId, target_type: "launch", user_id: user.id, vote: "up" as const });
        await supabase.from("launches").update({ upvotes: currentUpvotes + 1 }).eq("id", launchId);
      }
      queryClient.invalidateQueries({ queryKey: ["launches"] });
      queryClient.invalidateQueries({ queryKey: ["launch-votes"] });
    } catch { toast.error(t("launches.voteError")); }
  };

  const getLogoUrl = (launch: any) => {
    const tool = launch.tools as any;
    if (tool?.logo_url || tool?.website_url) return getToolLogoUrl(tool.logo_url, tool.website_url);
    if (launch.logo_url) return launch.logo_url;
    return null;
  };

  const getName = (launch: any) => {
    const tool = launch.tools as any;
    return tool?.name || launch.product_name || launch.tagline;
  };

  const getDescription = (launch: any) => {
    const tool = launch.tools as any;
    return tool?.short_description || launch.description || launch.tagline;
  };

  const getPricingType = (launch: any) => {
    const tool = launch.tools as any;
    return tool?.pricing_type || launch.pricing_type;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SEOHead title={`${t("launches.title")} - ToolScope`} description={t("launches.seoDesc")} />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container py-8">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <Rocket className="mr-2 inline h-7 w-7 text-primary" />
                {t("launches.title")}
              </h1>
              <p className="mt-1 text-muted-foreground">{t("launches.subtitle")}</p>
            </div>
            <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1.5"><Plus className="h-4 w-4" />{t("launches.submit")}</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader><DialogTitle>{t("launches.submitTitle")}</DialogTitle></DialogHeader>
                <LaunchSubmitForm onSuccess={() => { setSubmitOpen(false); queryClient.invalidateQueries({ queryKey: ["launches"] }); }} />
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="space-y-6">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
              <Rocket className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-lg font-medium">{t("launches.noLaunches")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("launches.beFirst")}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([date, items]) => (
                <div key={date}>
                  <div className="mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {isToday(parseISO(date)) ? t("launches.today") : format(parseISO(date), "EEEE, dd MMMM yyyy", { locale: viLocale })}
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {items?.map((launch, idx) => {
                      const tool = launch.tools as any;
                      const profile = launch.profiles as any;
                      const voted = userVotes?.has(launch.id);
                      const logoUrl = getLogoUrl(launch);
                      const pricingType = getPricingType(launch);
                      const features = (launch as any).features as string[] | null;
                      const websiteUrl = tool?.website_url || (launch as any).website_url;

                      return (
                        <Card key={launch.id} className="group transition-all hover:shadow-md">
                          <CardContent className="flex items-start gap-4 p-4">
                            <span className="text-lg font-bold text-muted-foreground/50 w-6 text-center mt-1">{idx + 1}</span>
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                              {logoUrl ? (
                                <img src={logoUrl} alt="" className="h-full w-full rounded-xl object-cover" />
                              ) : (
                                <Rocket className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {tool ? (
                                  <Link to={`/tool/${tool.slug}`} className="font-semibold hover:text-primary transition-colors">{getName(launch)}</Link>
                                ) : (
                                  <span className="font-semibold">{getName(launch)}</span>
                                )}
                                {launch.status === "featured" && (
                                  <Badge variant="default" className="text-[10px] px-1.5 py-0"><Star className="h-2.5 w-2.5 mr-0.5" /> Featured</Badge>
                                )}
                                {websiteUrl && (
                                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{getDescription(launch)}</p>
                              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <span>by {profile?.display_name || "Unknown"}</span>
                                {pricingType && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{pricingType}</Badge>}
                                {features && features.length > 0 && features.slice(0, 3).map((f, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{f}</Badge>
                                ))}
                              </div>
                              {(launch as any).maker_comment && (
                                <p className="mt-1.5 text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2 line-clamp-2">
                                  "{(launch as any).maker_comment}"
                                </p>
                              )}
                            </div>
                            <Button variant={voted ? "default" : "outline"} size="sm" className="flex-col h-14 w-14 gap-0.5 shrink-0" onClick={() => handleVote(launch.id, launch.upvotes || 0)}>
                              <ThumbsUp className={cn("h-4 w-4", voted && "fill-current")} />
                              <span className="text-xs font-bold">{launch.upvotes || 0}</span>
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
