import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { PageLayout } from "@/components/layout/PageLayout";
import { ToolCard } from "@/components/tools/ToolCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Globe, Lock, Trash2, StickyNote, Pencil, Check, X } from "lucide-react";
import { useCollections } from "@/hooks/useCollections";
import { toast } from "sonner";

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useI18n();
  const { removeFromCollection } = useCollections();
  const queryClient = useQueryClient();

  const { data: collection, isLoading } = useQuery({
    queryKey: ["collection", id],
    queryFn: async () => { const { data, error } = await supabase.from("collections" as any).select("*, profiles:user_id(display_name)").eq("id", id!).single(); if (error) throw error; return data as any; },
    enabled: !!id,
  });

  const { data: items } = useQuery({
    queryKey: ["collection-items", id],
    queryFn: async () => { const { data, error } = await supabase.from("collection_items" as any).select("*, tools(*, categories(name), ai_scores(overall_score, is_recommended))").eq("collection_id", id!).order("sort_order", { ascending: true }); if (error) throw error; return data as any[]; },
    enabled: !!id,
  });

  const isOwner = user?.id === collection?.user_id;

  if (isLoading) return (<PageLayout><div className="container py-8"><Skeleton className="h-8 w-48 mb-4" /><Skeleton className="h-64 rounded-xl" /></div></PageLayout>);

  if (!collection) return (<PageLayout><div className="container py-16 text-center"><p className="text-xl text-muted-foreground">{t("collectionDetail.notFound")}</p><Link to="/collections" className="mt-4 inline-block text-primary hover:underline">← {t("common.back")}</Link></div></PageLayout>);

  return (
    <PageLayout>
      <div className="container py-8">
        <Link to="/collections" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> {t("collectionDetail.backToList")}
        </Link>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{collection.name}</h1>
            <Badge variant="outline">{collection.is_public ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}{collection.is_public ? "Public" : "Private"}</Badge>
          </div>
          {collection.description && (<p className="text-muted-foreground">{collection.description}</p>)}
          <p className="mt-1 text-sm text-muted-foreground">{t("collectionDetail.by")} {(collection.profiles as any)?.display_name || t("common.anonymous")} · {items?.length || 0} {t("common.tools")}</p>
        </div>
        {!items?.length ? (
          <div className="py-16 text-center text-muted-foreground">{t("collectionDetail.empty")}</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item: any) => {
              const tool = item.tools as any;
              if (!tool) return null;
              return (<CollectionItemCard key={item.id} item={item} tool={tool} isOwner={isOwner} collectionId={id!} onRemove={() => removeFromCollection({ collectionId: id!, toolId: tool.id })} onNoteUpdated={() => queryClient.invalidateQueries({ queryKey: ["collection-items", id] })} />);
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function CollectionItemCard({ item, tool, isOwner, collectionId, onRemove, onNoteUpdated }: { item: any; tool: any; isOwner: boolean; collectionId: string; onRemove: () => void; onNoteUpdated: () => void; }) {
  const { t } = useI18n();
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(item.note || "");

  const saveNote = async () => {
    const { error } = await supabase.from("collection_items" as any).update({ note: noteText.trim() || null }).eq("id", item.id);
    if (error) { toast.error(t("collectionDetail.noteSaveError")); } else { toast.success(t("collectionDetail.noteSaved")); onNoteUpdated(); }
    setEditingNote(false);
  };

  return (
    <div className="relative group space-y-2">
      <ToolCard id={tool.id} name={tool.name} slug={tool.slug} shortDescription={tool.short_description || undefined} logoUrl={tool.logo_url || undefined} websiteUrl={tool.website_url || undefined} pricingType={tool.pricing_type} avgRating={Number(tool.avg_rating) || 0} ratingCount={tool.rating_count} categoryName={(tool.categories as any)?.name} />
      {(item.note || isOwner) && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          {editingNote ? (
            <div className="space-y-2">
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder={t("collectionDetail.notePlaceholder")} rows={2} className="text-sm" autoFocus />
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingNote(false); setNoteText(item.note || ""); }}><X className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveNote}><Check className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <StickyNote className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground flex-1">{item.note || t("collectionDetail.addNote")}</p>
              {isOwner && (<Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setEditingNote(true)}><Pencil className="h-3 w-3" /></Button>)}
            </div>
          )}
        </div>
      )}
      {isOwner && (<Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button>)}
    </div>
  );
}
