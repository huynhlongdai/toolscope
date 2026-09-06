import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import { PageLayout } from "@/components/layout/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { ArrowLeft, Calendar, Eye, User, List, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { sanitizeHtml } from "@/lib/sanitize";
import { ShareButtons } from "@/components/share/ShareButtons";
import { ToolCard } from "@/components/tools/ToolCard";
import { useMemo } from "react";
import { AdUnit } from "@/components/ads/AdUnit";
import { VerdictBox } from "@/components/blog/VerdictBox";
import { ListicleItem, type ListicleItemData } from "@/components/blog/ListicleItem";
import { CaseStudyStats, type CaseStudyStat } from "@/components/blog/CaseStudyStats";
import { ToolsUsedSidebar, type ToolUsedEntry } from "@/components/blog/ToolsUsedSidebar";
import { AffiliateDisclosure } from "@/components/blog/AffiliateDisclosure";

type ArticleType = "review" | "listicle" | "case_study" | "comparison" | "howto";

/**
 * Graceful fallback: the article_type / verdict_ / listicle_items /
 * case_study_ columns are added by a migration that may not be applied
 * to the live DB yet (no elevated Supabase credentials available in this
 * environment). When the explicit column is missing/empty, infer the
 * type from tags/title so the site keeps rendering sensibly either way.
 */
function inferArticleType(post: any, listicleItems: unknown[], caseStudyStats: unknown[]): ArticleType {
  const explicit = post?.article_type as string | undefined;
  if (explicit && ["review", "listicle", "case_study", "comparison", "howto"].includes(explicit)) {
    return explicit as ArticleType;
  }
  if (listicleItems.length > 0) return "listicle";
  if (caseStudyStats.length > 0) return "case_study";

  const tags: string[] = (post?.tags as string[]) ?? [];
  const lowerTags = tags.map((t) => t.toLowerCase());
  const title = (post?.title ?? "").toLowerCase();

  if (/\btop\s?\d+\b/.test(title) || lowerTags.some((t) => t.includes("listicle") || t.includes("best-of") || t.includes("top-"))) {
    return "listicle";
  }
  if (/case study/.test(title) || lowerTags.some((t) => t.includes("case-study") || t.includes("case_study"))) {
    return "case_study";
  }
  if (/\bvs\b|comparison/.test(title) || lowerTags.some((t) => t.includes("comparison") || t === "vs")) {
    return "comparison";
  }
  if (/review/.test(title) || lowerTags.some((t) => t.includes("review"))) {
    return "review";
  }
  return "howto";
}

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

  // Structured content-first fields (may be absent until the migration is
  // applied to the live DB — always fall back to safe defaults).
  const primaryToolId = (post as any)?.primary_tool_id as string | undefined;
  const ctaLabel = (post as any)?.cta_label as string | undefined;
  const verdictRating = (post as any)?.verdict_rating as number | undefined;
  const verdictSummary = (post as any)?.verdict_summary as string | undefined;
  const verdictPros = (post as any)?.verdict_pros as string[] | undefined;
  const verdictCons = (post as any)?.verdict_cons as string[] | undefined;
  const verdictBestFor = (post as any)?.verdict_best_for as string | undefined;
  const listicleItems = useMemo<ListicleItemData[]>(
    () => (((post as any)?.listicle_items as ListicleItemData[]) ?? []).slice().sort((a, b) => a.rank - b.rank),
    [post]
  );
  const caseStudyStats = useMemo<CaseStudyStat[]>(() => ((post as any)?.case_study_stats as CaseStudyStat[]) ?? [], [post]);
  const caseStudyToolsUsedRaw = useMemo<{ role?: string; tool_id: string }[]>(
    () => ((post as any)?.case_study_tools_used as { role?: string; tool_id: string }[]) ?? [],
    [post]
  );

  const articleType = useMemo(() => inferArticleType(post, listicleItems, caseStudyStats), [post, listicleItems, caseStudyStats]);

  const hasAffiliateLinks = Boolean(
    (post as any)?.has_affiliate_links || primaryToolId || listicleItems.length > 0 || caseStudyToolsUsedRaw.length > 0
  );

  // Union of every tool id referenced anywhere on this article so we only
  // need one round-trip to Supabase.
  const allToolIds = useMemo(() => {
    const ids = new Set<string>(relatedToolIds);
    if (primaryToolId) ids.add(primaryToolId);
    listicleItems.forEach((item: any) => item.tool_id && ids.add(item.tool_id));
    caseStudyToolsUsedRaw.forEach((entry) => entry.tool_id && ids.add(entry.tool_id));
    return Array.from(ids);
  }, [relatedToolIds, primaryToolId, listicleItems, caseStudyToolsUsedRaw]);

  const { data: allTools = [] } = useQuery({
    queryKey: ["blog-article-tools", allToolIds],
    queryFn: async () => {
      if (!allToolIds.length) return [];
      const { data } = await supabase.from("tools").select("*, categories(name)").in("id", allToolIds);
      return data ?? [];
    },
    enabled: allToolIds.length > 0,
  });

  const toolsById = useMemo(() => {
    const map = new Map<string, any>();
    allTools.forEach((tool: any) => map.set(tool.id, tool));
    return map;
  }, [allTools]);

  const relatedTools = useMemo(() => relatedToolIds.map((id) => toolsById.get(id)).filter(Boolean), [relatedToolIds, toolsById]);
  const primaryTool = primaryToolId ? toolsById.get(primaryToolId) : undefined;
  const caseStudyToolsUsed: ToolUsedEntry[] = useMemo(
    () =>
      caseStudyToolsUsedRaw
        .map((entry) => {
          const tool = toolsById.get(entry.tool_id);
          return tool ? { role: entry.role, tool } : null;
        })
        .filter((x): x is ToolUsedEntry => x !== null),
    [caseStudyToolsUsedRaw, toolsById]
  );

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
      <PageLayout>
        <div className="container max-w-6xl py-8">
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
        </div>
      </PageLayout>
    );
  }

  if (!post) {
    return (
      <PageLayout>
        <div className="container py-16 text-center">
          <p className="text-xl text-muted-foreground">{t("blog.postNotFound")}</p>
          <Link to="/blog" className="mt-4 inline-block text-primary hover:underline">← {t("blog.backToBlog")}</Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
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

              <div className="flex items-center gap-2 flex-wrap">
                {articleType !== "howto" && (
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[10px] uppercase tracking-wide">
                    {t(`blog.filter${articleType === "case_study" ? "CaseStudy" : articleType.charAt(0).toUpperCase() + articleType.slice(1)}`, articleType)}
                  </Badge>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
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

              {/* Case study: headline stats bar up top for proof-first hook */}
              {articleType === "case_study" && caseStudyStats.length > 0 && (
                <CaseStudyStats stats={caseStudyStats} className="mt-6" />
              )}

              {hasAffiliateLinks && <AffiliateDisclosure className="mt-6" />}

              {/* Review: TL;DR verdict box before the full write-up */}
              {articleType === "review" && primaryTool && verdictRating != null && (
                <VerdictBox
                  tool={primaryTool}
                  rating={verdictRating}
                  summary={verdictSummary}
                  pros={verdictPros}
                  cons={verdictCons}
                  bestFor={verdictBestFor}
                  ctaLabel={ctaLabel}
                  className="mt-6"
                />
              )}

              <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none prose-headings:font-semibold prose-a:text-primary">
                {contentWithIds.startsWith("<") ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentWithIds) }} />
                ) : (
                  <ReactMarkdown>{displayContent}</ReactMarkdown>
                )}
              </div>

              {/* Listicle: ranked cards, each with its own CTA */}
              {articleType === "listicle" && listicleItems.length > 0 && (
                <div className="mt-8 space-y-4">
                  {listicleItems.map((item) => {
                    const tool = toolsById.get((item as any).tool_id);
                    if (!tool) return null;
                    return <ListicleItem key={item.rank} item={item} tool={tool} />;
                  })}
                </div>
              )}

              <AdUnit slotId="blog_mid" className="my-6" />

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
                          <OptimizedImage src={rp.cover_image_url} alt={rp.title} wrapperClassName="h-16 w-24 rounded-md flex-shrink-0" className="h-full w-full object-cover" />
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
              {/* Case study: tools used, with mini affiliate CTAs */}
              {articleType === "case_study" && caseStudyToolsUsed.length > 0 && (
                <ToolsUsedSidebar tools={caseStudyToolsUsed} />
              )}

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
                          <OptimizedImage src={rp.cover_image_url} alt={rp.title} wrapperClassName="h-14 w-20 rounded-md flex-shrink-0" className="h-full w-full object-cover" />
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
    </PageLayout>
  );
}
