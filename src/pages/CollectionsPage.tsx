import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useCollections } from "@/hooks/useCollections";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Globe, Lock, Trash2, FolderOpen, Layers } from "lucide-react";

export default function CollectionsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { myCollections, isLoading: myLoading, createCollection, deleteCollection } = useCollections();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const { data: publicCollections, isLoading: publicLoading } = useQuery({
    queryKey: ["public-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections" as any)
        .select("*, profiles:user_id(display_name, avatar_url), collection_items(count)")
        .eq("is_public", true)
        .order("upvotes", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
  });

  const handleCreate = () => {
    if (!name.trim()) return;
    createCollection(
      { name: name.trim(), description: description.trim() || undefined, isPublic },
      {
        onSuccess: () => { setName(""); setDescription(""); setCreateOpen(false); },
      } as any
    );
  };

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {t("collections.title")}
            </h1>
            <p className="mt-1 text-muted-foreground">{t("collections.subtitle")}</p>
          </div>
          {user && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> {t("collections.create")}</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("collections.createNew")}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input placeholder={t("collections.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
                  <Textarea placeholder={t("collections.descPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                  <div className="flex items-center gap-3">
                    <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
                    <Label htmlFor="public" className="flex items-center gap-1.5">
                      {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      {isPublic ? t("collections.public") : t("collections.private")}
                    </Label>
                  </div>
                  <Button className="w-full" onClick={handleCreate}>{t("collections.createButton")}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {user && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5" /> {t("collections.yours")}
            </h2>
            {myLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : myCollections.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">{t("collections.noOwn")}</CardContent></Card>
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
                            {c.is_public ? t("collections.public") : t("collections.private")}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteCollection(c.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {c.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.description}</p>}
                      <span className="text-xs text-muted-foreground">{(c.collection_items as any)?.[0]?.count || 0} tools</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FolderOpen className="h-5 w-5" /> {t("collections.popular")}
          </h2>
          {publicLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : !publicCollections?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">{t("collections.noPublic")}</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publicCollections.map((c: any) => (
                <Card key={c.id} className="hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-2">
                    <Link to={`/collection/${c.id}`}>
                      <CardTitle className="text-base hover:text-primary transition-colors">{c.name}</CardTitle>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {c.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{t("collections.by")} {(c.profiles as any)?.display_name || t("reviews.anonymous")}</span>
                      <span>{(c.collection_items as any)?.[0]?.count || 0} tools</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
