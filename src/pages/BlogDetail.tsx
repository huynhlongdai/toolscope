import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Eye, User, List, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ShareButtons } from "@/components/share/ShareButtons";
import { ToolCard } from "@/components/tools/ToolCard";
import { useMemo } from "react";
import { AdUnit } from "@/components/ads/AdUnit";

function parseHeadings(html: string) {
  const regex = /<h([23])[^>]*>(.*?)<\/h\1>/gi;
  const headings: { level: number; text: string; id: string }[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, "");
    const id = text.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F]+/gi, "-").replace(/^-|-$/g, "");
    headings.push({ level: parseInt(match[1]), text, id });
  }
  return headings;
}

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t, locale } = useI18n();

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
      if (data) {
        supabase.from("blog_posts").update({ view_count: data.view_count + 1 }).eq("id", data.id).then();
      }
      return data;
    },
    enabled: !!slug,
  });

  const { translated, isTranslated } = useTranslatedContent(
    "blog",
    post?.id,
    ["title", "content", "excerpt"],
    { title: post?.title, content: post?.content, excerpt: post?.excerpt }
  );

  const displayTitle = translated.title || post?.title || "";
  const displayContent = translated.content || post?.content || "";

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

  // Related posts by tags
  const currentTags = (post?.tags as string[]) ?? [];
  const { data: relatedPosts = [] } = useQuery({
    queryKey: ["blog-related-posts", post?.id, currentTags],
    queryFn: async () => {
      if (!currentTags.length || !post?.id) return [];
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, cover_image_url, published_at, excerpt")
        .eq("status", "published")
        .neq("id", post.id)
        .overlaps("tags", currentTags)
        .order("published_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: currentTags.length > 0 && !!post?.id,
  });

  // Parse headings for TOC
  const headings = useMemo(() => {
    if (!displayContent) return [];
    return parseHeadings(displayContent);
  }, [displayContent]);

  // Inject IDs into HTML content for TOC anchors
  const contentWithIds = useMemo(() => {
    if (!displayContent.startsWith("<")) return displayContent;
    let result = displayContent;
    headings.forEach(({ level, text, id }) => {
      const regex = new RegExp(`(<h${level})(>\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "i");
      result = result.replace(regex, `$1 id="${id}"$2`);
    });
    return result;
  }, [displayContent, headings]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container max-w-6xl py-8">
          <div className="flex gap-8">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-8 w-64 mb-4" />
              <Skeleton className="h-64 rounded-xl mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="hidden lg:block w-80 space-y-4">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          </div>
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
          <p className="text-xl text-muted-foreground">{t("blog.postNotFound")}</p>
          <Link to="/blog" className="mt-4 inline-block text-primary hover:underline">← {t("blog.backToBlog")}</Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container max-w-6xl py-8">
          <div className="flex gap-8">
            {/* Main article */}
            <article className="flex-1 min-w-0">
              <Link to="/blog" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> {t("blog.backToBlog")}
              </Link>

              {post.cover_image_url && (
                <div className="mb-6 aspect-video overflow-hidden rounded-xl">
                  <img src={post.cover_image_url} alt={displayTitle} className="h-full w-full object-cover" />
                </div>
              )}

              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold leading-tight md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {displayTitle}
                </h1>
                {isTranslated && locale !== "vi" && (
                  <Badge variant="outline" className="text-[10px]">EN</Badge>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {(post.profiles as any)?.display_name || t("reviews.anonymous")}
                </span>
                {post.published_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {new Date(post.published_at).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4" />
                  {post.view_count} {t("tool.views")}
                </span>
              </div>

              {/* Tags - visible on mobile, hidden on lg (shown in sidebar) */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
                  {post.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <ShareButtons title={displayTitle} />
              </div>

              <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none prose-headings:font-semibold prose-a:text-primary">
                {contentWithIds.startsWith("<") ? (
                  <div dangerouslySetInnerHTML={{ __html: contentWithIds }} />
                ) : (
                  <ReactMarkdown>{displayContent}</ReactMarkdown>
                )}
              </div>

              {/* Related tools - mobile only */}
              {relatedTools.length > 0 && (
                <div className="mt-12 border-t pt-8 lg:hidden">
                  <h2 className="text-xl font-bold mb-4">{t("blog.relatedTools")}</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {relatedTools.map((tool: any) => (
                      <ToolCard
                        key={tool.id}
                        id={tool.id}
                        name={tool.name}
                        slug={tool.slug}
                        shortDescription={tool.short_description}
                        logoUrl={tool.logo_url}
                        websiteUrl={tool.website_url}
                        pricingType={tool.pricing_type}
                        avgRating={tool.avg_rating ?? 0}
                        ratingCount={tool.rating_count ?? 0}
                        categoryName={tool.categories?.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Related posts - mobile only */}
              {relatedPosts.length > 0 && (
                <div className="mt-8 border-t pt-8 lg:hidden">
                  <h2 className="text-xl font-bold mb-4">📖 Bài viết liên quan</h2>
                  <div className="space-y-3">
                    {relatedPosts.map((rp: any) => (
                      <Link key={rp.id} to={`/blog/${rp.slug}`} className="flex gap-3 group">
                        {rp.cover_image_url && (
                          <img src={rp.cover_image_url} alt={rp.title} className="h-16 w-24 rounded-md object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{rp.title}</p>
                          {rp.published_at && (
                            <p className="text-xs text-muted-foreground mt-1">{new Date(rp.published_at).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN")}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Sidebar - desktop only */}
            <aside className="hidden lg:block w-80 flex-shrink-0 space-y-6">
              {/* Table of Contents */}
              {headings.length > 0 && (
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <List className="h-4 w-4" /> Mục lục
                  </h3>
                  <nav className="space-y-1">
                    {headings.map((h, i) => (
                      <a
                        key={i}
                        href={`#${h.id}`}
                        className={`block text-sm text-muted-foreground hover:text-foreground transition-colors ${h.level === 3 ? "pl-4" : ""}`}
                      >
                        {h.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="text-sm font-semibold mb-3">🏷️ Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Tools */}
              {relatedTools.length > 0 && (
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="text-sm font-semibold mb-3">{t("blog.relatedTools")}</h3>
                  <div className="space-y-3">
                    {relatedTools.map((tool: any) => (
                      <Link key={tool.id} to={`/tool/${tool.slug}`} className="flex items-center gap-3 group">
                        {tool.logo_url ? (
                          <img src={tool.logo_url} alt={tool.name} className="h-8 w-8 rounded-md object-cover flex-shrink-0" />
                        ) : (
                          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">{tool.name?.[0]}</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{tool.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{tool.short_description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <BookOpen className="h-4 w-4" /> Bài viết liên quan
                  </h3>
                  <div className="space-y-3">
                    {relatedPosts.map((rp: any) => (
                      <Link key={rp.id} to={`/blog/${rp.slug}`} className="flex gap-3 group">
                        {rp.cover_image_url && (
                          <img src={rp.cover_image_url} alt={rp.title} className="h-14 w-20 rounded-md object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{rp.title}</p>
                          {rp.published_at && (
                            <p className="text-xs text-muted-foreground mt-1">{new Date(rp.published_at).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN")}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
