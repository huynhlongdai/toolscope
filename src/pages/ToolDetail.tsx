import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchToolBySlug, fetchToolReviews, checkBookmark, toggleBookmark, upsertRating, fetchUserRating } from "@/services/tools";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import { PageLayout } from "@/components/layout/PageLayout";
import { PreviewBanner } from "@/components/preview/PreviewBanner";
import { useAdminAuth } from "@/hooks/useAdminAuth";

import { StructuredReviewForm } from "@/components/tool-detail/StructuredReviewForm";
import { ReviewBreakdown } from "@/components/tool-detail/ReviewBreakdown";
import { ScreenshotGallery } from "@/components/tool-detail/ScreenshotGallery";
import { AlternativesSection } from "@/components/tool-detail/AlternativesSection";
import { VoteButtons } from "@/components/tool-detail/VoteButtons";
import { CommentSection } from "@/components/tool-detail/CommentSection";
import { QASection } from "@/components/tool-detail/QASection";
import { DetailedArticle } from "@/components/tool-detail/DetailedArticle";
import { PricingHistoryChart } from "@/components/tool-detail/PricingHistoryChart";
import { PricingPlansCard } from "@/components/tool-detail/PricingPlansCard";
import { DealsSection } from "@/components/deals/DealsSection";
import { FollowButton } from "@/components/follow/FollowButton";
import { AddToCollectionDialog } from "@/components/collections/AddToCollectionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Star, Bookmark, BookmarkCheck,
  MessageCircle, ArrowLeft, GitCompareArrows,
  Globe, DollarSign, Zap, Shield, BarChart3, Sparkles, ChevronUp
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { sanitizeHtml } from "@/lib/sanitize";
import { getToolLogoUrl } from "@/lib/favicon";
import { ShareButtons } from "@/components/share/ShareButtons";
import { UpvoteButton } from "@/components/UpvoteButton";
import { VendorClaimBadge, VendorClaimButton } from "@/components/tool-detail/VendorClaimButton";
import { VendorResponse } from "@/components/tool-detail/VendorResponse";
import { AdUnit } from "@/components/ads/AdUnit";
import { QuickVerdictCard } from "@/components/tool-detail/QuickVerdictCard";
import { QuickFactsStrip } from "@/components/tool-detail/QuickFactsStrip";
import { StickyMobileCTA } from "@/components/tool-detail/StickyMobileCTA";

export default function ToolDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { isAdminOrEditor, loading: roleLoading } = useAdminAuth();

  const { data: tool, isLoading } = useQuery({
    queryKey: ["tool", slug, isAdminOrEditor],
    queryFn: () => fetchToolBySlug(slug!, isAdminOrEditor),
    enabled: !!slug && !roleLoading,
  });

  // Translated content from DB
  const { translated, isTranslated } = useTranslatedContent(
    "tool",
    tool?.id,
    ["name", "description", "short_description", "detailed_content"],
    {
      name: tool?.name,
      description: tool?.description,
      short_description: tool?.short_description,
      detailed_content: (tool as any)?.detailed_content,
    }
  );

  const displayName = translated.name || tool?.name || "";
  const displayDesc = translated.description || tool?.description || "";
  const displayShort = translated.short_description || tool?.short_description || "";
  const displayDetailed = translated.detailed_content || (tool as any)?.detailed_content || "";

  const pricingLabel = (type: string) => t(`pricing.${type}`, type);

  const { data: reviews } = useQuery({
    queryKey: ["tool-reviews", tool?.id],
    queryFn: () => fetchToolReviews(tool!.id),
    enabled: !!tool?.id,
  });

  const { data: existingRating } = useQuery({
    queryKey: ["user-rating", tool?.id, user?.id],
    queryFn: () => fetchUserRating(tool!.id, user!.id),
    enabled: !!tool?.id && !!user?.id,
  });

  useEffect(() => {
    if (existingRating) setUserRating(existingRating);
  }, [existingRating]);

  const { data: isBookmarked, refetch: refetchBookmark } = useQuery({
    queryKey: ["bookmark", tool?.id, user?.id],
    queryFn: () => checkBookmark(tool!.id, user!.id),
    enabled: !!tool?.id && !!user?.id,
  });

  const handleToggleBookmark = async () => {
    if (!user) { toast.error(t("tool.loginRequired")); return; }
    await toggleBookmark(tool!.id, user.id, !!isBookmarked);
    refetchBookmark();
  };

  const submitRating = async (score: number) => {
    if (!user) { toast.error(t("tool.loginRequired")); return; }
    setUserRating(score);
    try {
      await upsertRating(tool!.id, user.id, score);
      toast.success(t("tool.ratingSuccess").replace("{n}", String(score)));
    } catch (error: any) {
      toast.error(t("tool.ratingError"), { description: error.message });
    }
  };

  const faqItems: { question: string; answer: string }[] = Array.isArray((tool as any)?.faq) ? (tool as any).faq : [];

  useEffect(() => {
    if (faqItems.length === 0) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-schema";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
    document.head.appendChild(script);
    return () => { document.getElementById("faq-schema")?.remove(); };
  }, [faqItems]);

  // Product + AggregateRating JSON-LD — this is what Google Rich Results
  // and AI answer engines (ChatGPT/Perplexity/AI Overviews) read to cite
  // this page's rating when someone asks "is <tool> good?" or "<tool> review".
  useEffect(() => {
    if (!tool || !tool.rating_count || tool.rating_count === 0) return;
    const aiScoreData = tool.ai_scores as any;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "product-schema";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: displayName,
      description: displayShort || displayDesc || undefined,
      applicationCategory: (tool.categories as any)?.name || "AI Tool",
      url: tool.website_url || undefined,
      image: tool.logo_url || undefined,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(tool.avg_rating).toFixed(1),
        reviewCount: tool.rating_count,
        bestRating: "5",
        worstRating: "1",
      },
      ...(aiScoreData?.summary && {
        review: {
          "@type": "Review",
          reviewBody: aiScoreData.summary,
          reviewRating: {
            "@type": "Rating",
            ratingValue: Number(aiScoreData.overall_score).toFixed(1),
            bestRating: "10",
            worstRating: "0",
          },
          author: { "@type": "Organization", name: "Astute Tools" },
        },
      }),
    });
    document.head.appendChild(script);
    return () => { document.getElementById("product-schema")?.remove(); };
  }, [tool, displayName, displayShort, displayDesc]);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="container py-8">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="mb-8 h-64 rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (!tool) {
    return (
      <PageLayout>
        <div className="container py-16 text-center">
          <p className="text-xl text-muted-foreground">{t("tool.notFound")}</p>
          <Link to="/tools" className="mt-4 inline-block text-primary hover:underline">{t("tool.backToTools")}</Link>
        </div>
      </PageLayout>
    );
  }

  const aiScore = tool.ai_scores as any;
  const cat = tool.categories as any;

  return (
    <PageLayout>
        {tool.status !== "published" && <PreviewBanner status={tool.status} />}
        <div className="container py-8">
          <Link to="/tools" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("tool.backToList")}
          </Link>

          {/* Tool Header */}
          <div className="mb-6 md:mb-8">
            {/* Mobile: stacked layout */}
            <div className="md:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-xl font-bold text-muted-foreground">
                  {(() => {
                    const resolvedLogo = getToolLogoUrl(tool.logo_url, tool.website_url);
                    return resolvedLogo ? (
                      <img src={resolvedLogo} alt={displayName} className="h-full w-full rounded-xl object-cover" />
                    ) : displayName.charAt(0);
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="text-xl font-bold leading-tight truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {displayName}
                    </h1>
                    {aiScore?.is_recommended && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] h-5 shrink-0">⚡</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {cat?.name && (
                      <Badge variant="secondary" className="text-[10px] h-5">{cat.name}</Badge>
                    )}
                    {tool.rating_count > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {Number(tool.avg_rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Mobile action bar */}
              <div className="flex items-center gap-2 mt-3">
                {(tool.affiliate_url || tool.website_url) && (
                  <Button asChild size="sm" className="flex-1 h-9 text-xs gap-1.5">
                    <a href={tool.affiliate_url || tool.website_url} target="_blank" rel="noopener noreferrer sponsored">
                      <Globe className="h-3.5 w-3.5" />
                      {t("tool.visitWebsite")}
                    </a>
                  </Button>
                )}
                <UpvoteButton targetId={tool.id} targetType="tool" currentUpvotes={tool.upvotes ?? 0} tableName="tools" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={isBookmarked ? "secondary" : "outline"} size="icon" className="h-9 w-9" onClick={handleToggleBookmark}>
                      {isBookmarked ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{isBookmarked ? t("tool.saved") : t("tool.save")}</p></TooltipContent>
                </Tooltip>
                <ShareButtons title={displayName} />
              </div>
              {displayShort && (
                <p className="mt-2.5 text-sm text-muted-foreground line-clamp-2">{displayShort}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] h-5">{pricingLabel(tool.pricing_type)}</Badge>
                <span className="text-xs text-muted-foreground">{tool.view_count.toLocaleString()} {t("tool.views")}</span>
                <VendorClaimBadge toolId={tool.id} />
              </div>
            </div>

            {/* Desktop: side-by-side layout */}
            <div className="hidden md:flex md:items-start md:justify-between md:gap-6">
              <div className="flex items-start gap-5 flex-1 min-w-0">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl font-bold text-muted-foreground">
                  {(() => {
                    const resolvedLogo = getToolLogoUrl(tool.logo_url, tool.website_url);
                    return resolvedLogo ? (
                      <img src={resolvedLogo} alt={displayName} className="h-full w-full rounded-2xl object-cover" />
                    ) : displayName.charAt(0);
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {displayName}
                    </h1>
                    {isTranslated && locale !== "vi" && (
                      <Badge variant="outline" className="text-[10px]">EN</Badge>
                    )}
                    {aiScore?.is_recommended && (
                      <Badge className="bg-primary text-primary-foreground text-xs">⚡ AI</Badge>
                    )}
                    <VendorClaimBadge toolId={tool.id} />
                  </div>
                  {displayShort && (
                    <p className="mt-2 text-base text-muted-foreground">{displayShort}</p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {cat?.name && (
                      <Link to={`/category/${cat.slug}`}>
                        <Badge variant="secondary" className="text-xs">{cat.name}</Badge>
                      </Link>
                    )}
                    <Badge variant="outline" className="text-xs">{pricingLabel(tool.pricing_type)}</Badge>
                    {tool.rating_count > 0 && (
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {Number(tool.avg_rating).toFixed(1)}
                        <span className="text-muted-foreground">({tool.rating_count})</span>
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">{tool.view_count.toLocaleString()} {t("tool.views")}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-row gap-2 shrink-0">
                {(tool.affiliate_url || tool.website_url) && (
                  <Button asChild className="gap-1.5 h-10 px-4 text-sm" size="sm">
                    <a href={tool.affiliate_url || tool.website_url} target="_blank" rel="noopener noreferrer sponsored">
                      <Globe className="h-4 w-4" />
                      {t("tool.visitWebsite")}
                    </a>
                  </Button>
                )}
                <FollowButton targetType="tool" targetId={tool.id} showCount />
                <UpvoteButton targetId={tool.id} targetType="tool" currentUpvotes={tool.upvotes ?? 0} tableName="tools" />
                <AddToCollectionDialog toolId={tool.id} toolName={displayName} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={isBookmarked ? "secondary" : "outline"} size="icon" className="h-10 w-10" onClick={handleToggleBookmark}>
                      {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{isBookmarked ? t("tool.saved") : t("tool.save")}</p></TooltipContent>
                </Tooltip>
                <ShareButtons title={displayName} />
                <VendorClaimButton toolId={tool.id} toolName={displayName} />
              </div>
            </div>
          </div>

          {/* E-E-A-T trust signals */}
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              {t("tool.reviewedBy", "Đánh giá bởi")} <span className="font-medium text-foreground">Astute Tools Editorial</span>
            </span>
            {tool.updated_at && (
              <span>
                {t("tool.lastUpdated", "Cập nhật lần cuối")}: {new Date(tool.updated_at).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN")}
              </span>
            )}
          </div>

          <QuickVerdictCard
            toolName={displayName}
            logoUrl={tool.logo_url}
            websiteUrl={tool.website_url}
            affiliateUrl={tool.affiliate_url}
            rating={Number(tool.avg_rating) || 0}
            ratingCount={tool.rating_count || 0}
            bestFor={cat?.name}
            pros={aiScore?.pros}
            cons={aiScore?.cons}
            summary={aiScore?.summary}
            isRecommended={!!aiScore?.is_recommended}
            className="mb-6"
          />

          <QuickFactsStrip
            pricingType={tool.pricing_type}
            hasFreeTrial={(tool as any).has_free_trial}
            trialDays={(tool as any).trial_days}
            requiresCard={(tool as any).requires_card}
            platforms={(tool as any).platforms}
            className="mb-8"
          />

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <AdUnit slotId="tool_detail_top" className="mb-4" />
              {displayDesc && (
                <Card>
                  <CardHeader><CardTitle>{t("tool.introduction")}</CardTitle></CardHeader>
                  <CardContent>
                    {displayDesc.startsWith("<") ? (
                      <div className="prose prose-neutral dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayDesc) }} />
                    ) : (
                      <p className="text-muted-foreground whitespace-pre-wrap">{displayDesc}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <PricingPlansCard
                pricingDetails={(tool as any).pricing_details}
                pricingType={tool.pricing_type}
                toolName={displayName}
              />

              <DetailedArticle
                toolId={tool.id}
                toolName={displayName}
                detailedContent={displayDetailed}
                isAdmin={!!user}
                logoUrl={tool.logo_url}
                websiteUrl={tool.website_url}
                affiliateUrl={tool.affiliate_url}
                rating={Number(tool.avg_rating) || 0}
              />

              {faqItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" /> {t("tool.faq")} ({faqItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {faqItems.map((item, idx) => (
                        <AccordionItem key={idx} value={`faq-${idx}`}>
                          <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                          <AccordionContent>
                            <p className="text-muted-foreground">{item.answer}</p>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              )}

              <AdUnit slotId="tool_detail_mid" className="my-4" />

              <Card>
                <CardHeader><CardTitle>{t("tool.yourRating")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => submitRating(s)}
                        className="p-0.5"
                      >
                        <Star className={`h-7 w-7 transition-colors ${
                          s <= (hoverRating || userRating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        }`} />
                      </button>
                    ))}
                    {userRating > 0 && <span className="ml-2 text-sm text-muted-foreground">{t("tool.ratedStars").replace("{n}", String(userRating))}</span>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" /> {t("tool.reviews")} ({reviews?.length || 0})
                    </CardTitle>
                    <StructuredReviewForm toolId={tool.id} userId={user?.id} />
                  </div>
                </CardHeader>
                <CardContent>
                  {reviews && reviews.length > 0 ? (
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b border-border pb-5 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              {(review.profiles as any)?.display_name?.charAt(0) || "?"}
                            </div>
                            <span className="text-sm font-medium">{(review.profiles as any)?.display_name || t("reviews.anonymous")}</span>
                            {review.is_editor_review && <Badge variant="secondary" className="text-[10px]">Editor</Badge>}
                            <span className="text-xs text-muted-foreground ml-auto">{new Date(review.created_at).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN")}</span>
                          </div>
                          <h4 className="font-medium mb-1">{review.title}</h4>
                          <div className="text-sm text-muted-foreground prose prose-sm prose-neutral dark:prose-invert max-w-none">
                            <ReactMarkdown>{review.content}</ReactMarkdown>
                          </div>
                          <div className="mt-2">
                            <VoteButtons targetId={review.id} targetType="review" upvotes={review.upvotes} downvotes={review.downvotes} userId={user?.id} />
                          </div>
                          <VendorResponse reviewId={review.id} toolId={tool.id} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("tool.noReviews")}</p>
                  )}
                </CardContent>
              </Card>

              <CommentSection toolId={tool.id} userId={user?.id} />
              <QASection toolId={tool.id} userId={user?.id} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-2">
              <DealsSection toolId={tool.id} toolName={displayName} />
              {aiScore ? (
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" /> AI Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <span className="text-4xl font-bold text-primary">{Number(aiScore.overall_score).toFixed(1)}</span>
                      <span className="text-lg text-muted-foreground">/10</span>
                    </div>
                    {[
                      { label: t("tool.easeOfUse"), value: aiScore.ease_of_use, icon: Shield },
                      { label: t("tool.features"), value: aiScore.features, icon: Zap },
                      { label: t("tool.value"), value: aiScore.value_for_money, icon: DollarSign },
                      { label: t("tool.support"), value: aiScore.support, icon: MessageCircle },
                      { label: t("tool.performance"), value: aiScore.performance, icon: BarChart3 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs flex-1">{item.label}</span>
                        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${((Number(item.value) || 0) / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-6 text-right">{Number(item.value || 0).toFixed(1)}</span>
                      </div>
                    ))}
                    {aiScore.pros && aiScore.pros.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">{t("tool.pros")}</p>
                        <ul className="space-y-0.5">
                          {aiScore.pros.map((p: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground">+ {p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiScore.cons && aiScore.cons.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">{t("tool.cons")}</p>
                        <ul className="space-y-0.5">
                          {aiScore.cons.map((c: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground">− {c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiScore.summary && (
                      <p className="text-xs text-muted-foreground border-t border-border pt-3">{aiScore.summary}</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed border-muted-foreground/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="h-5 w-5" /> AI Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center py-6">
                    <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{t("tool.aiAnalyzing")}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{t("tool.aiScoreSoon")}</p>
                  </CardContent>
                </Card>
              )}

              <ReviewBreakdown reviews={(reviews || []) as any} />
              <ScreenshotGallery toolId={tool.id} toolName={displayName} />
              <AlternativesSection toolId={tool.id} toolName={displayName} categoryId={tool.category_id} />

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => navigate(`/tools?q=${encodeURIComponent(`Similar to ${displayName}`)}`)}
              >
                <Sparkles className="h-4 w-4" />
                {t("tool.findSimilar")}
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => navigate(`/compare?tools=${tool.id}`)}
              >
                <GitCompareArrows className="h-4 w-4" />
                {t("tool.compareWith")}
              </Button>

              <PricingHistoryChart toolId={tool.id} toolName={displayName} />
            </div>
          </div>
        </div>

        {/* Back to top */}
        {showBackToTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-32 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl md:bottom-6 md:right-6"
            aria-label="Back to top"
          >
            <ChevronUp className="h-5 w-5" />
          </button>
        )}

        <StickyMobileCTA
          toolName={displayName}
          logoUrl={tool.logo_url}
          websiteUrl={tool.website_url}
          affiliateUrl={tool.affiliate_url}
          rating={Number(tool.avg_rating) || 0}
        />
    </PageLayout>
  );
}
