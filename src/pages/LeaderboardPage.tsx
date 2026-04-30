import { PageLayout } from "@/components/layout/PageLayout";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { fetchTopUsers, fetchTopReviewers, fetchTopCommenters, fetchAllUserBadges } from "@/services/leaderboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Crown, TrendingUp, MessageCircle, FileText } from "lucide-react";
import { Link } from "react-router-dom";

function getRankIcon(idx: number) {
  if (idx === 0) return <Crown className="h-5 w-5 text-amber-500" />;
  if (idx === 1) return <Medal className="h-5 w-5 text-slate-400" />;
  if (idx === 2) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{idx + 1}</span>;
}

function getRankBg(idx: number) {
  if (idx === 0) return "bg-amber-500/5 border-amber-500/20";
  if (idx === 1) return "bg-slate-400/5 border-slate-400/20";
  if (idx === 2) return "bg-amber-700/5 border-amber-700/20";
  return "";
}

export default function LeaderboardPage() {
  const { t } = useI18n();

  const { data: topUsers, isLoading } = useQuery({
    queryKey: ["leaderboard-all"],
    queryFn: () => fetchTopUsers(),
  });

  const { data: topReviewers } = useQuery({
    queryKey: ["leaderboard-reviewers"],
    queryFn: () => fetchTopReviewers(),
  });

  const { data: topCommenters } = useQuery({
    queryKey: ["leaderboard-commenters"],
    queryFn: () => fetchTopCommenters(),
  });

  const { data: userBadges } = useQuery({
    queryKey: ["leaderboard-badges"],
    queryFn: fetchAllUserBadges,
  });

  const badgeEmoji: Record<string, string> = {
    early_adopter: "🌟", top_reviewer: "✍️", helpful: "🤝", power_user: "⚡", curator: "📚",
  };

  const renderUserRow = (profile: any, idx: number, stat?: { label: string; value: number }) => (
    <div
      key={profile.id}
      className={`flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/50 ${getRankBg(idx)}`}
    >
      <div className="flex items-center justify-center w-8">{getRankIcon(idx)}</div>
      <Link to={`/profile/${profile.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback>{(profile.display_name || "?").charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold truncate">{profile.display_name || t("leaderboard.anonymous")}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(userBadges?.[profile.id] || []).map((b: string) => (
              <span key={b} className="text-xs" title={b}>{badgeEmoji[b] || "🏅"}</span>
            ))}
          </div>
        </div>
      </Link>
      <div className="text-right shrink-0">
        {stat ? (
          <div>
            <p className="text-lg font-bold text-primary">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-bold text-primary">{profile.reputation_score}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("leaderboard.points")}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <PageLayout title={t("leaderboard.seoTitle")} description={t("leaderboard.seoDesc")}>
        <div className="container py-8 max-w-3xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {t("leaderboard.title")}
              </h1>
            </div>
            <p className="text-muted-foreground">{t("leaderboard.subtitle")}</p>
          </div>

          <Tabs defaultValue="reputation" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reputation" className="gap-1.5">
                <TrendingUp className="h-4 w-4" /> {t("leaderboard.tabReputation")}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-1.5">
                <FileText className="h-4 w-4" /> {t("leaderboard.tabReviews")}
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-1.5">
                <MessageCircle className="h-4 w-4" /> {t("leaderboard.tabComments")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reputation">
              <div className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
                ) : topUsers?.length ? (
                  topUsers.map((u: any, idx: number) => renderUserRow(u, idx))
                ) : (
                  <p className="text-center text-muted-foreground py-12">{t("leaderboard.noData")}</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-2">
                {topReviewers?.length ? (
                  topReviewers.map((item: any, idx: number) =>
                    renderUserRow(item.profile, idx, { label: "reviews", value: item.count })
                  )
                ) : (
                  <p className="text-center text-muted-foreground py-12">{t("leaderboard.noData")}</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="comments">
              <div className="space-y-2">
                {topCommenters?.length ? (
                  topCommenters.map((item: any, idx: number) =>
                    renderUserRow(item.profile, idx, { label: t("leaderboard.comments"), value: item.count })
                  )
                ) : (
                  <p className="text-center text-muted-foreground py-12">{t("leaderboard.noData")}</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
    </PageLayout>
  );
}
