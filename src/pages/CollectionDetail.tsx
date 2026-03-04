import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ToolCard } from "@/components/tools/ToolCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Globe, Lock, Trash2 } from "lucide-react";
import { useCollections } from "@/hooks/useCollections";

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { removeFromCollection } = useCollections();

  const { data: collection, isLoading } = useQuery({
    queryKey: ["collection", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections" as any)
        .select("*, profiles:user_id(display_name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: items } = useQuery({
    queryKey: ["collection-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_items" as any)
        .select("*, tools(*, categories(name), ai_scores(overall_score, is_recommended))")
        .eq("collection_id", id!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  const isOwner = user?.id === collection?.user_id;

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 rounded-xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <p className="text-xl text-muted-foreground">Không tìm thấy collection</p>
          <Link to="/collections" className="mt-4 inline-block text-primary hover:underline">← Quay lại</Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-8">
        <Link to="/collections" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Collections
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {collection.name}
            </h1>
            <Badge variant="outline">
              {collection.is_public ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
              {collection.is_public ? "Public" : "Private"}
            </Badge>
          </div>
          {collection.description && (
            <p className="text-muted-foreground">{collection.description}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            bởi {(collection.profiles as any)?.display_name || "Ẩn danh"} · {items?.length || 0} tools
          </p>
        </div>

        {!items?.length ? (
          <div className="py-16 text-center text-muted-foreground">
            Collection này chưa có tool nào
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item: any) => {
              const tool = item.tools as any;
              if (!tool) return null;
              return (
                <div key={item.id} className="relative group">
                  <ToolCard
                    id={tool.id}
                    name={tool.name}
                    slug={tool.slug}
                    shortDescription={tool.short_description || undefined}
                    logoUrl={tool.logo_url || undefined}
                    websiteUrl={tool.website_url || undefined}
                    pricingType={tool.pricing_type}
                    avgRating={Number(tool.avg_rating) || 0}
                    ratingCount={tool.rating_count}
                    categoryName={(tool.categories as any)?.name}
                  />
                  {isOwner && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFromCollection({ collectionId: id!, toolId: tool.id })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
