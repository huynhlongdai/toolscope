import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Eye, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ShareButtons } from "@/components/share/ShareButtons";
import { ToolCard } from "@/components/tools/ToolCard";

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, profiles:author_id(display_name, avatar_url)")
        .eq("slug", slug!)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;

      // Increment view count
      if (data) {
        supabase.from("blog_posts").update({ view_count: data.view_count + 1 }).eq("id", data.id).then();
      }
      return data;
    },
    enabled: !!slug,
  });

  const relatedToolIds = (post?.related_tool_ids as string[]) ?? [];
  const { data: relatedTools = [] } = useQuery({
    queryKey: ["blog-related-tools", relatedToolIds],
    queryFn: async () => {
      if (!relatedToolIds.length) return [];
      const { data } = await supabase.from("tools").select("*, categories(name)").in("id", relatedToolIds);
      return data ?? [];
    },
    enabled: relatedToolIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container max-w-3xl py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 rounded-xl mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <p className="text-xl text-muted-foreground">Không tìm thấy bài viết</p>
          <Link to="/blog" className="mt-4 inline-block text-primary hover:underline">← Quay lại blog</Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <article className="container max-w-3xl py-8">
          <Link to="/blog" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Blog
          </Link>

          {post.cover_image_url && (
            <div className="mb-6 aspect-video overflow-hidden rounded-xl">
              <img src={post.cover_image_url} alt={post.title} className="h-full w-full object-cover" />
            </div>
          )}

          <h1 className="text-3xl font-bold leading-tight md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {(post.profiles as any)?.display_name || "Ẩn danh"}
            </span>
            {post.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(post.published_at).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {post.view_count} lượt xem
            </span>
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}

          <div className="mt-4">
            <ShareButtons title={post.title} />
          </div>

          <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none prose-headings:font-semibold prose-a:text-primary">
            {post.content.startsWith("<") ? (
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            ) : (
              <ReactMarkdown>{post.content}</ReactMarkdown>
            )}
          </div>

          {relatedTools.length > 0 && (
            <div className="mt-12 border-t pt-8">
              <h2 className="text-xl font-bold mb-4">🔗 Công cụ liên quan</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedTools.map((t: any) => (
                  <ToolCard
                    key={t.id}
                    id={t.id}
                    name={t.name}
                    slug={t.slug}
                    shortDescription={t.short_description}
                    logoUrl={t.logo_url}
                    websiteUrl={t.website_url}
                    pricingType={t.pricing_type}
                    avgRating={t.avg_rating ?? 0}
                    ratingCount={t.rating_count ?? 0}
                    categoryName={t.categories?.name}
                  />
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}
