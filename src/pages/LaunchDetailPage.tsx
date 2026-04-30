import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShareButtons } from "@/components/share/ShareButtons";
import { LaunchCountdown } from "@/components/launches/LaunchCountdown";
import { LaunchSubscribeButton } from "@/components/launches/LaunchSubscribeButton";
import { LaunchComments } from "@/components/launches/LaunchComments";
import { ThumbsUp, Rocket, ExternalLink, Star, ArrowLeft, Play, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getToolLogoUrl } from "@/lib/favicon";

export default function LaunchDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: launch, isLoading } = useQuery({
    queryKey: ["launch-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("launches")
        .select("*, profiles:maker_id(display_name, avatar_url, bio), tools(name, slug, logo_url, website_url, short_description, pricing_type)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: userVote } = useQuery({
    queryKey: ["launch-vote", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("votes").select("id").eq("target_id", id!).eq("target_type", "launch").eq("user_id", user!.id).eq("vote", "up").maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id,
  });

  const handleVote = async () => {
    if (!user || !launch) { toast.error("Vui lòng đăng nhập"); return; }
    if (userVote) {
      await supabase.from("votes").delete().eq("target_id", launch.id).eq("target_type", "launch").eq("user_id", user.id);
      await supabase.from("launches").update({ upvotes: Math.max(0, (launch.upvotes || 0) - 1) }).eq("id", launch.id);
    } else {
      await supabase.from("votes").insert({ target_id: launch.id, target_type: "launch", user_id: user.id, vote: "up" as const });
      await supabase.from("launches").update({ upvotes: (launch.upvotes || 0) + 1 }).eq("id", launch.id);
    }
    queryClient.invalidateQueries({ queryKey: ["launch-detail", id] });
    queryClient.invalidateQueries({ queryKey: ["launch-vote", id] });
  };

  if (isLoading) return (
    <PageLayout>
      <div className="container py-8"><Skeleton className="h-96" /></div>
    </PageLayout>
  );

  if (!launch) return (
    <PageLayout>
      <div className="container py-16 text-center">
        <p className="text-lg">Launch không tồn tại</p>
        <Link to="/launches" className="text-primary hover:underline mt-2 inline-block">← Quay lại</Link>
      </div>
    </PageLayout>
  );

  const tool = launch.tools as any;
  const profile = launch.profiles as any;
  const name = tool?.name || launch.product_name || launch.tagline;
  const description = tool?.short_description || launch.description || launch.tagline;
  const logoUrl = tool?.logo_url || tool?.website_url ? getToolLogoUrl(tool?.logo_url, tool?.website_url) : launch.logo_url;
  const websiteUrl = tool?.website_url || launch.website_url;
  const features = launch.features as string[] | null;
  const screenshots = launch.screenshots as string[] | null;
  const isScheduled = launch.scheduled_at && new Date(launch.scheduled_at) > new Date();

  return (
    <PageLayout title={`${name} - Launch | ToolScope`} description={description || ""}>
        <div className="container py-8 max-w-4xl">
          <Link to="/launches" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Quay lại Launches
          </Link>

          {/* Hero */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-muted overflow-hidden">
              {logoUrl ? <img src={logoUrl} alt={name} className="h-full w-full object-cover" /> : <Rocket className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold">{name}</h1>
                {launch.status === "featured" && (
                  <Badge variant="default" className="gap-0.5"><Star className="h-3 w-3" /> Featured</Badge>
                )}
              </div>
              <p className="text-lg text-muted-foreground mt-1">{launch.tagline}</p>

              {isScheduled && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">🚀 Ra mắt sau:</p>
                  <LaunchCountdown targetDate={launch.scheduled_at!} />
                </div>
              )}

              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <Button variant={userVote ? "default" : "outline"} size="lg" className="gap-2" onClick={handleVote}>
                  <ThumbsUp className={cn("h-5 w-5", userVote && "fill-current")} />
                  <span className="font-bold">{launch.upvotes || 0}</span>
                </Button>

                {isScheduled && (
                  <LaunchSubscribeButton launchId={launch.id} subscriberCount={launch.subscriber_count || 0} size="default" />
                )}

                {(launch as any).trial_url && (
                  <Button asChild variant="secondary" size="lg" className="gap-2">
                    <a href={(launch as any).trial_url} target="_blank" rel="noopener noreferrer">
                      <FlaskConical className="h-4 w-4" /> Dùng thử
                    </a>
                  </Button>
                )}

                {websiteUrl && (
                  <Button asChild variant="outline" size="lg" className="gap-2">
                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" /> Website
                    </a>
                  </Button>
                )}

                <ShareButtons title={`${name} - ${launch.tagline}`} />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mt-8 space-y-8">
            {/* Description */}
            {launch.description && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-semibold mb-3">Giới thiệu</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap">{launch.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Features */}
            {features && features.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-semibold mb-3">Tính năng nổi bật</h2>
                  <div className="flex flex-wrap gap-2">
                    {features.map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-sm px-3 py-1">{f}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Screenshots */}
            {screenshots && screenshots.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-semibold mb-3">Screenshots</h2>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {screenshots.map((url, i) => (
                      <img key={i} src={url} alt="" className="h-48 rounded-lg border object-cover shrink-0" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Video */}
            {launch.video_url && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-semibold mb-3 flex items-center gap-2"><Play className="h-4 w-4" /> Video Demo</h2>
                  <a href={launch.video_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{launch.video_url}</a>
                </CardContent>
              </Card>
            )}

            {/* Maker */}
            {profile && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-semibold mb-3">Maker</h2>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback>{(profile.display_name || "M")[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{profile.display_name}</p>
                      {profile.bio && <p className="text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>}
                    </div>
                  </div>
                  {launch.maker_comment && (
                    <div className="mt-3 border-l-2 border-primary/30 pl-3 italic text-muted-foreground">
                      "{launch.maker_comment}"
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            <Card>
              <CardContent className="pt-6">
                <LaunchComments launchId={launch.id} />
              </CardContent>
            </Card>
          </div>
        </div>
    </PageLayout>
  );
}
