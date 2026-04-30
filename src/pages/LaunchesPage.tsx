import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isToday, isThisWeek } from "date-fns";
import { vi as viLocale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ThumbsUp, Rocket, Plus, Calendar, Star, ExternalLink, Bell, FlaskConical, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { getToolLogoUrl } from "@/lib/favicon";
import { LaunchSubmitForm } from "@/components/launches/LaunchSubmitForm";
import { LaunchCountdown } from "@/components/launches/LaunchCountdown";
import { LaunchSubscribeButton } from "@/components/launches/LaunchSubscribeButton";
import { ShareButtons } from "@/components/share/ShareButtons";

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

  const todayLaunches = launches?.filter(l => isToday(parseISO(l.launch_date))) || [];
  const weekLaunches = launches?.filter(l => isThisWeek(parseISO(l.launch_date)) && !isToday(parseISO(l.launch_date))) || [];
  const comingSoon = launches?.filter(l => (l as any).is_coming_soon || ((l as any).scheduled_at && new Date((l as any).scheduled_at) > new Date())) || [];
  const allLaunched = launches?.filter(l => !((l as any).is_coming_soon && !(launches?.some(x => x.launch_date <= new Date().toISOString().slice(0, 10) && x.id === l.id)))) || [];

  const { data: userVotes } = useQuery({
    queryKey: ["launch-votes", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("votes").select("target_id").eq("user_id", user!.id).eq("target_type", "launch").eq("vote", "up");
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
    return launch.logo_url || null;
  };

  const renderLaunchCard = (launch: any, idx: number) => {
    const tool = launch.tools as any;
    const profile = launch.profiles as any;
    const voted = userVotes?.has(launch.id);
    const logoUrl = getLogoUrl(launch);
    const pricingType = tool?.pricing_type || launch.pricing_type;
    const features = launch.features as string[] | null;
    const websiteUrl = tool?.website_url || launch.website_url;
    const name = tool?.name || launch.product_name || launch.tagline;
    const desc = tool?.short_description || launch.description || launch.tagline;
    const isScheduled = launch.scheduled_at && new Date(launch.scheduled_at) > new Date();

    return (
      <Card key={launch.id} className="group transition-all hover:shadow-md">
        <CardContent className="flex items-start gap-4 p-4">
          <span className="text-lg font-bold text-muted-foreground/50 w-6 text-center mt-1">{idx + 1}</span>
          <Link to={`/launch/${launch.id}`} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted overflow-hidden">
            {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full rounded-xl object-cover" /> : <Rocket className="h-5 w-5 text-muted-foreground" />}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/launch/${launch.id}`} className="font-semibold hover:text-primary transition-colors">{name}</Link>
              {launch.status === "featured" && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0"><Star className="h-2.5 w-2.5 mr-0.5" /> Featured</Badge>
              )}
              {isScheduled && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1"><Clock className="h-2.5 w-2.5" /> Coming Soon</Badge>
              )}
              {websiteUrl && (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{desc}</p>

            {isScheduled && <LaunchCountdown targetDate={launch.scheduled_at} compact className="mt-1" />}

            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span>by {profile?.display_name || "Unknown"}</span>
              {pricingType && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{pricingType}</Badge>}
              {features && features.slice(0, 3).map((f, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{f}</Badge>
              ))}
            </div>
            {launch.maker_comment && (
              <p className="mt-1.5 text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2 line-clamp-2">
                "{launch.maker_comment}"
              </p>
            )}

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {isScheduled && <LaunchSubscribeButton launchId={launch.id} subscriberCount={launch.subscriber_count || 0} />}
              {launch.trial_url && (
                <Button asChild variant="outline" size="sm" className="h-7 gap-1 text-xs">
                  <a href={launch.trial_url} target="_blank" rel="noopener noreferrer"><FlaskConical className="h-3 w-3" /> Dùng thử</a>
                </Button>
              )}
              <ShareButtons title={`${name} - ${launch.tagline}`} />
            </div>
          </div>
          <Button variant={voted ? "default" : "outline"} size="sm" className="flex-col h-14 w-14 gap-0.5 shrink-0" onClick={() => handleVote(launch.id, launch.upvotes || 0)}>
            <ThumbsUp className={cn("h-4 w-4", voted && "fill-current")} />
            <span className="text-xs font-bold">{launch.upvotes || 0}</span>
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderGroup = (items: any[]) => {
    if (!items.length) return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <Rocket className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">Chưa có launch nào</p>
      </div>
    );
    // Group by date
    const grouped = items.reduce((acc, l) => {
      const d = l.launch_date;
      if (!acc[d]) acc[d] = [];
      acc[d].push(l);
      return acc;
    }, {} as Record<string, any[]>);

    return (
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, dateItems]) => (
          <div key={date}>
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {isToday(parseISO(date)) ? "Hôm nay" : format(parseISO(date), "EEEE, dd MMMM yyyy", { locale: viLocale })}
              </h2>
            </div>
            <div className="space-y-3">
              {(dateItems as any[]).map((l, idx) => renderLaunchCard(l, idx))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <PageLayout title={`${t("launches.title")} - ToolScope`} description={t("launches.seoDesc")}>
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
          ) : (
            <Tabs defaultValue="today" className="space-y-6">
              <TabsList>
                <TabsTrigger value="today" className="gap-1.5">
                  🔥 Hôm nay {todayLaunches.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{todayLaunches.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="week" className="gap-1.5">
                  📅 Tuần này {weekLaunches.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{weekLaunches.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="coming" className="gap-1.5">
                  🚀 Sắp ra mắt {comingSoon.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{comingSoon.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="all">Tất cả</TabsTrigger>
              </TabsList>

              <TabsContent value="today">{renderGroup(todayLaunches)}</TabsContent>
              <TabsContent value="week">{renderGroup(weekLaunches)}</TabsContent>
              <TabsContent value="coming">{renderGroup(comingSoon)}</TabsContent>
              <TabsContent value="all">{renderGroup(allLaunched)}</TabsContent>
            </Tabs>
          )}
        </div>
    </PageLayout>
  );
}
