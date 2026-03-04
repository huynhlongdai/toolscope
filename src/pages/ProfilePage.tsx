import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SEOHead } from "@/components/seo/SEOHead";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, MessageSquare, Award, BookOpen, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const badgeLabels: Record<string, { label: string; color: string; icon: string }> = {
  top_reviewer: { label: "Top Reviewer", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: "⭐" },
  early_adopter: { label: "Early Adopter", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "🚀" },
  expert: { label: "Expert", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: "🏆" },
  helpful: { label: "Helpful", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: "💡" },
};

const ProfilePage = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const profileId = id || user?.id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", profileId).single();
      return data;
    },
    enabled: !!profileId,
  });

  const { data: badges } = useQuery({
    queryKey: ["user-badges", profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data } = await supabase.from("user_badges").select("*").eq("user_id", profileId);
      return data || [];
    },
    enabled: !!profileId,
  });

  const { data: reviews } = useQuery({
    queryKey: ["user-reviews", profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data } = await supabase
        .from("reviews")
        .select("*, tools(name, slug)")
        .eq("author_id", profileId)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!profileId,
  });

  const { data: stats } = useQuery({
    queryKey: ["user-stats", profileId],
    queryFn: async () => {
      if (!profileId) return { reviews: 0, comments: 0, questions: 0 };
      const [r, c, q] = await Promise.all([
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("author_id", profileId),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", profileId),
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("user_id", profileId),
      ]);
      return { reviews: r.count || 0, comments: c.count || 0, questions: q.count || 0 };
    },
    enabled: !!profileId,
  });

  if (!profileId && !user) return <Navigate to="/auth" />;

  return (
    <div className="flex min-h-screen flex-col">
      <SEOHead title={`${profile?.display_name || "Profile"} - ToolScope`} />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container py-8 max-w-4xl">
          {isLoading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : profile ? (
            <>
              {/* Profile header */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-start gap-5">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                        {(profile.display_name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {profile.display_name || "Người dùng"}
                      </h1>
                      {profile.username && <p className="text-muted-foreground">@{profile.username}</p>}
                      {profile.bio && <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>}
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Award className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{profile.reputation_score}</span>
                          <span className="text-muted-foreground">điểm</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          Tham gia {new Date(profile.created_at).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                      {badges && badges.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {badges.map((b: any) => {
                            const info = badgeLabels[b.badge_type] || { label: b.badge_type, color: "bg-muted text-muted-foreground", icon: "🏅" };
                            return (
                              <Badge key={b.id} className={`${info.color} text-xs`}>
                                {info.icon} {info.label}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { icon: BookOpen, label: "Reviews", value: stats?.reviews || 0 },
                  { icon: MessageSquare, label: "Bình luận", value: stats?.comments || 0 },
                  { icon: Star, label: "Câu hỏi", value: stats?.questions || 0 },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="p-4 text-center">
                      <s.icon className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="reviews">
                <TabsList>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="activity">Hoạt động</TabsTrigger>
                </TabsList>
                <TabsContent value="reviews" className="space-y-3 mt-4">
                  {reviews?.length ? reviews.map((r: any) => (
                    <Card key={r.id}>
                      <CardContent className="p-4">
                        <h3 className="font-semibold">{r.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Tool: <span className="text-foreground">{r.tools?.name}</span> · {new Date(r.created_at).toLocaleDateString("vi-VN")}
                        </p>
                      </CardContent>
                    </Card>
                  )) : (
                    <p className="text-muted-foreground text-center py-8">Chưa có review nào.</p>
                  )}
                </TabsContent>
                <TabsContent value="activity">
                  <p className="text-muted-foreground text-center py-8">Sắp ra mắt.</p>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12">Không tìm thấy hồ sơ.</p>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default ProfilePage;
