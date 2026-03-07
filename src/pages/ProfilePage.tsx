import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SEOHead } from "@/components/seo/SEOHead";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useParams, Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star, MessageSquare, Award, BookOpen, Calendar, Pencil, Save, Bookmark, Layers, Plus, Globe, Lock, Trash2, FolderOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ToolCard } from "@/components/tools/ToolCard";
import { useCollections } from "@/hooks/useCollections";

const badgeLabels: Record<string, { label: string; color: string; icon: string }> = {
  top_reviewer: { label: "Top Reviewer", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: "⭐" },
  early_adopter: { label: "Early Adopter", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "🚀" },
  expert: { label: "Expert", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: "🏆" },
  helpful: { label: "Helpful", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: "💡" },
};

const LOCALE_MAP: Record<string, string> = { vi: "vi-VN", en: "en-US", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR", th: "th-TH", id: "id-ID", es: "es-ES", fr: "fr-FR", pt: "pt-BR", de: "de-DE" };

function ProfileHeader({ profile, badges, isOwnProfile, editing, onStartEdit, editForm, setEditForm, onSave, onCancel, isSaving }: any) {
  const { t, locale } = useI18n();
  return (
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
              {profile.display_name || t("profile.defaultName")}
            </h1>
            {profile.username && <p className="text-muted-foreground">@{profile.username}</p>}
            {profile.bio && <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm">
                <Award className="h-4 w-4 text-primary" />
                <span className="font-semibold">{profile.reputation_score}</span>
                <span className="text-muted-foreground">{t("profile.points")}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {t("profile.joined")} {new Date(profile.created_at).toLocaleDateString(LOCALE_MAP[locale] || "vi-VN")}
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
          {isOwnProfile && !editing && (
            <Button variant="outline" size="sm" onClick={onStartEdit}>
              <Pencil className="mr-1 h-3 w-3" /> {t("profile.editBtn")}
            </Button>
          )}
        </div>

        {editing && isOwnProfile && (
          <div className="mt-4 border-t pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("profile.displayName")}</Label>
                <Input value={editForm.display_name} onChange={(e) => setEditForm((p: any) => ({ ...p, display_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("profile.username")}</Label>
                <Input value={editForm.username} onChange={(e) => setEditForm((p: any) => ({ ...p, username: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("profile.bio")}</Label>
              <Textarea value={editForm.bio} onChange={(e) => setEditForm((p: any) => ({ ...p, bio: e.target.value }))} rows={2} maxLength={500} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("profile.website")}</Label>
              <Input value={editForm.website} onChange={(e) => setEditForm((p: any) => ({ ...p, website: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={onSave} disabled={isSaving}>
                <Save className="mr-1 h-3 w-3" /> {t("common.save")}
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel}>{t("common.cancel")}</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BookmarksTab({ userId }: { userId: string }) {
  const { t } = useI18n();
  const { data: bookmarks, isLoading } = useQuery({
    queryKey: ["bookmarks", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("tool_id, tools(*, categories(name), ai_scores(overall_score, is_recommended))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return data?.map((b: any) => b.tools).filter(Boolean) || [];
    },
  });

  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  if (!bookmarks?.length) return (
    <div className="text-center py-12">
      <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
      <p className="text-muted-foreground">{t("profile.noBookmarks")}</p>
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bookmarks.map((tool: any) => (
        <ToolCard key={tool.id} id={tool.id} name={tool.name} slug={tool.slug} shortDescription={tool.short_description} logoUrl={tool.logo_url} websiteUrl={tool.website_url} pricingType={tool.pricing_type} avgRating={tool.avg_rating || 0} ratingCount={tool.rating_count || 0} categoryName={tool.categories?.name} isTrending={tool.is_trending} isAiRecommended={tool.ai_scores?.is_recommended} aiScore={tool.ai_scores?.overall_score} />
      ))}
    </div>
  );
}

function CollectionsTab({ userId }: { userId: string }) {
  const { t } = useI18n();
  const { myCollections, isLoading, createCollection, deleteCollection } = useCollections();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const handleCreate = () => {
    if (!name.trim()) return;
    createCollection(
      { name: name.trim(), description: description.trim() || undefined, isPublic },
      { onSuccess: () => { setName(""); setDescription(""); setCreateOpen(false); } } as any
    );
  };

  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {t("profile.createNew")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("profile.createCollection")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder={t("collections.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
              <Textarea placeholder={t("collections.descPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              <div className="flex items-center gap-3">
                <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
                <Label htmlFor="public" className="flex items-center gap-1.5">
                  {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {isPublic ? t("profile.public") : t("profile.private")}
                </Label>
              </div>
              <Button className="w-full" onClick={handleCreate}>{t("common.create")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {myCollections.length === 0 ? (
        <div className="text-center py-12">
          <Layers className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">{t("profile.noCollections")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myCollections.map((c: any) => (
            <Card key={c.id} className="group hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <Link to={`/collection/${c.id}`} className="flex-1">
                    <CardTitle className="text-base hover:text-primary transition-colors">{c.name}</CardTitle>
                  </Link>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      {c.is_public ? <Globe className="h-2.5 w-2.5 mr-0.5" /> : <Lock className="h-2.5 w-2.5 mr-0.5" />}
                      {c.is_public ? "Public" : "Private"}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteCollection(c.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {c.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.description}</p>}
                <span className="text-xs text-muted-foreground">{(c.collection_items as any)?.[0]?.count || 0} {t("common.tools")}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const ProfilePage = () => {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const profileId = id || user?.id;
  const isOwnProfile = !id || id === user?.id;
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: "", username: "", bio: "", website: "" });

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
      const { data } = await supabase.from("reviews").select("*, tools(name, slug)").eq("author_id", profileId).eq("status", "published").order("created_at", { ascending: false }).limit(10);
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

  const { data: comments } = useQuery({
    queryKey: ["user-comments", profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data } = await supabase.from("comments").select("*, tools:tool_id(name, slug)").eq("user_id", profileId).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!profileId,
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!profileId) return;
      const { error } = await supabase.from("profiles").update({
        display_name: editForm.display_name,
        username: editForm.username || null,
        bio: editForm.bio || null,
        website: editForm.website || null,
      }).eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
      toast.success(t("profile.profileUpdated"));
      setEditing(false);
    },
    onError: (e: any) => toast.error(e.message || t("profile.updateError")),
  });

  const startEditing = () => {
    if (profile) {
      setEditForm({
        display_name: profile.display_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        website: profile.website || "",
      });
      setEditing(true);
    }
  };

  if (!profileId && !user) return <Navigate to="/auth" />;

  const dateLocale = LOCALE_MAP[locale] || "vi-VN";

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
              <ProfileHeader profile={profile} badges={badges} isOwnProfile={isOwnProfile} editing={editing} onStartEdit={startEditing} editForm={editForm} setEditForm={setEditForm} onSave={() => updateProfile.mutate()} onCancel={() => setEditing(false)} isSaving={updateProfile.isPending} />

              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { icon: BookOpen, label: t("profile.statReviews"), value: stats?.reviews || 0 },
                  { icon: MessageSquare, label: t("profile.statComments"), value: stats?.comments || 0 },
                  { icon: Star, label: t("profile.statQuestions"), value: stats?.questions || 0 },
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

              <Tabs defaultValue="reviews">
                <TabsList>
                  <TabsTrigger value="reviews">{t("profile.tabReviews")}</TabsTrigger>
                  <TabsTrigger value="activity">{t("profile.tabActivity")}</TabsTrigger>
                  {isOwnProfile && <TabsTrigger value="bookmarks">{t("profile.tabBookmarks")}</TabsTrigger>}
                  {isOwnProfile && <TabsTrigger value="collections">{t("profile.tabCollections")}</TabsTrigger>}
                </TabsList>

                <TabsContent value="reviews" className="space-y-3 mt-4">
                  {reviews?.length ? reviews.map((r: any) => (
                    <Card key={r.id}>
                      <CardContent className="p-4">
                        <h3 className="font-semibold">{r.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Tool: <span className="text-foreground">{r.tools?.name}</span> · {new Date(r.created_at).toLocaleDateString(dateLocale)}
                        </p>
                      </CardContent>
                    </Card>
                  )) : (
                    <p className="text-muted-foreground text-center py-8">{t("profile.noReviews")}</p>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-3 mt-4">
                  {comments && comments.length > 0 ? (
                    <>
                      <h3 className="text-sm font-medium text-muted-foreground">{t("profile.recentComments")}</h3>
                      {comments.map((c: any) => (
                        <Card key={c.id}>
                          <CardContent className="p-4">
                            <p className="text-sm">{c.content.slice(0, 150)}{c.content.length > 150 ? "..." : ""}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Tool: <span className="text-foreground">{(c.tools as any)?.name || "—"}</span> · {new Date(c.created_at).toLocaleDateString(dateLocale)}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">{t("profile.noActivity")}</p>
                  )}
                </TabsContent>

                {isOwnProfile && (
                  <TabsContent value="bookmarks" className="mt-4">
                    <BookmarksTab userId={profileId!} />
                  </TabsContent>
                )}

                {isOwnProfile && (
                  <TabsContent value="collections" className="mt-4">
                    <CollectionsTab userId={profileId!} />
                  </TabsContent>
                )}
              </Tabs>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12">{t("profile.notFound")}</p>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default ProfilePage;
