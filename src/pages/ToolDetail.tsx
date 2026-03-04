import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ToolCard } from "@/components/tools/ToolCard";
import { ReviewForm } from "@/components/tool-detail/ReviewForm";
import { VoteButtons } from "@/components/tool-detail/VoteButtons";
import { CommentSection } from "@/components/tool-detail/CommentSection";
import { QASection } from "@/components/tool-detail/QASection";
import { DetailedArticle } from "@/components/tool-detail/DetailedArticle";
import { PricingHistoryChart } from "@/components/tool-detail/PricingHistoryChart";
import { FollowButton } from "@/components/follow/FollowButton";
import { AddToCollectionDialog } from "@/components/collections/AddToCollectionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Star, Bookmark, BookmarkCheck,
  MessageCircle, ArrowLeft, GitCompareArrows,
  Globe, DollarSign, Zap, Shield, BarChart3, Sparkles
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { getToolLogoUrl } from "@/lib/favicon";
import { ShareButtons } from "@/components/share/ShareButtons";

const pricingLabel: Record<string, string> = {
  free: "Miễn phí", freemium: "Freemium", paid: "Trả phí",
  open_source: "Open Source", contact: "Liên hệ",
};

export default function ToolDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const { data: tool, isLoading } = useQuery({
    queryKey: ["tool", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name, slug), ai_scores(*)")
        .eq("slug", slug!)
        .eq("status", "published")
        .maybeSingle() as any; // detailed_content not in types yet
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: reviews } = useQuery({
    queryKey: ["tool-reviews", tool?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles:author_id(display_name, avatar_url)")
        .eq("tool_id", tool!.id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!tool?.id,
  });

  const { data: isBookmarked, refetch: refetchBookmark } = useQuery({
    queryKey: ["bookmark", tool?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("tool_id", tool!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!tool?.id && !!user?.id,
  });

  const { data: alternatives } = useQuery({
    queryKey: ["alternatives", tool?.category_id, tool?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name), ai_scores(overall_score, is_recommended)")
        .eq("status", "published")
        .eq("category_id", tool!.category_id!)
        .neq("id", tool!.id)
        .order("avg_rating", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!tool?.category_id,
  });

  const toggleBookmark = async () => {
    if (!user) { toast({ title: "Vui lòng đăng nhập", variant: "destructive" }); return; }
    if (isBookmarked) {
      await supabase.from("bookmarks").delete().eq("tool_id", tool!.id).eq("user_id", user.id);
    } else {
      await supabase.from("bookmarks").insert({ tool_id: tool!.id, user_id: user.id });
    }
    refetchBookmark();
  };

  const submitRating = async (score: number) => {
    if (!user) { toast({ title: "Vui lòng đăng nhập", variant: "destructive" }); return; }
    setUserRating(score);
    const { error } = await supabase.from("ratings").upsert(
      { tool_id: tool!.id, user_id: user.id, score },
      { onConflict: "tool_id,user_id" }
    );
    if (error) { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Đã đánh giá ${score} sao!` });
  };

  const faqItems: { question: string; answer: string }[] = Array.isArray((tool as any)?.faq) ? (tool as any).faq : [];

  // FAQ JSON-LD Schema
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="mb-8 h-64 rounded-xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <p className="text-xl text-muted-foreground">Không tìm thấy công cụ này</p>
          <Link to="/tools" className="mt-4 inline-block text-primary hover:underline">← Quay lại danh sách</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const aiScore = tool.ai_scores as any;
  const cat = tool.categories as any;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-8">
          <Link to="/tools" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </Link>

          {/* Tool Header */}
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-muted text-2xl font-bold text-muted-foreground">
                {(() => {
                  const resolvedLogo = getToolLogoUrl(tool.logo_url, tool.website_url);
                  return resolvedLogo ? (
                    <img src={resolvedLogo} alt={tool.name} className="h-full w-full rounded-2xl object-cover" />
                  ) : tool.name.charAt(0);
                })()}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {tool.name}
                  </h1>
                  {aiScore?.is_recommended && (
                    <Badge className="bg-primary text-primary-foreground">⚡ AI Recommended</Badge>
                  )}
                </div>
                {tool.short_description && (
                  <p className="mt-2 text-lg text-muted-foreground">{tool.short_description}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {cat?.name && (
                    <Link to={`/category/${cat.slug}`}>
                      <Badge variant="secondary">{cat.name}</Badge>
                    </Link>
                  )}
                  <Badge variant="outline">{pricingLabel[tool.pricing_type] || tool.pricing_type}</Badge>
                  {tool.rating_count > 0 && (
                    <span className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {Number(tool.avg_rating).toFixed(1)}
                      <span className="text-muted-foreground">({tool.rating_count} đánh giá)</span>
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">{tool.view_count.toLocaleString()} lượt xem</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(tool.affiliate_url || tool.website_url) && (
                <Button asChild className="gap-2">
                  <a href={tool.affiliate_url || tool.website_url} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" /> Truy cập website
                  </a>
                </Button>
              )}
              <FollowButton targetType="tool" targetId={tool.id} showCount />
              <AddToCollectionDialog toolId={tool.id} toolName={tool.name} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={isBookmarked ? "secondary" : "outline"} size="icon" onClick={toggleBookmark}>
                    {isBookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isBookmarked ? "Đã lưu" : "Lưu lại"}</p></TooltipContent>
              </Tooltip>
              <ShareButtons title={tool.name} />
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Description */}
              {tool.description && (
                <Card>
                  <CardHeader><CardTitle>Giới thiệu</CardTitle></CardHeader>
                  <CardContent>
                    {tool.description.startsWith("<") ? (
                      <div className="prose prose-neutral dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: tool.description }} />
                    ) : (
                      <p className="text-muted-foreground whitespace-pre-wrap">{tool.description}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Detailed Article */}
              <DetailedArticle
                toolId={tool.id}
                toolName={tool.name}
                detailedContent={(tool as any).detailed_content}
                isAdmin={!!user}
              />

              {/* FAQ Section */}
              {faqItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" /> Câu hỏi thường gặp ({faqItems.length})
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

              {/* Your Rating */}
              <Card>
                <CardHeader><CardTitle>Đánh giá của bạn</CardTitle></CardHeader>
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
                    {userRating > 0 && <span className="ml-2 text-sm text-muted-foreground">Bạn đã đánh giá {userRating} sao</span>}
                  </div>
                </CardContent>
              </Card>

              {/* Reviews */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" /> Reviews ({reviews?.length || 0})
                    </CardTitle>
                    <ReviewForm toolId={tool.id} userId={user?.id} />
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
                            <span className="text-sm font-medium">{(review.profiles as any)?.display_name || "Ẩn danh"}</span>
                            {review.is_editor_review && <Badge variant="secondary" className="text-[10px]">Editor</Badge>}
                            <span className="text-xs text-muted-foreground ml-auto">{new Date(review.created_at).toLocaleDateString("vi-VN")}</span>
                          </div>
                          <h4 className="font-medium mb-1">{review.title}</h4>
                          <div className="text-sm text-muted-foreground prose prose-sm prose-neutral dark:prose-invert max-w-none">
                            <ReactMarkdown>{review.content}</ReactMarkdown>
                          </div>
                          <div className="mt-2">
                            <VoteButtons targetId={review.id} targetType="review" upvotes={review.upvotes} downvotes={review.downvotes} userId={user?.id} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Chưa có review nào. Hãy là người đầu tiên!</p>
                  )}
                </CardContent>
              </Card>

              {/* Comments */}
              <CommentSection toolId={tool.id} userId={user?.id} />

              {/* Q&A */}
              <QASection toolId={tool.id} userId={user?.id} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* AI Score Card */}
              {aiScore && (
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
                      { label: "Dễ sử dụng", value: aiScore.ease_of_use, icon: Shield },
                      { label: "Tính năng", value: aiScore.features, icon: Zap },
                      { label: "Giá trị", value: aiScore.value_for_money, icon: DollarSign },
                      { label: "Hỗ trợ", value: aiScore.support, icon: MessageCircle },
                      { label: "Hiệu suất", value: aiScore.performance, icon: BarChart3 },
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
                        <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Ưu điểm</p>
                        <ul className="space-y-0.5">
                          {aiScore.pros.map((p: string, i: number) => (
                            <li key={i} className="text-xs text-muted-foreground">+ {p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiScore.cons && aiScore.cons.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Nhược điểm</p>
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
              )}

              {/* Alternatives */}
              {alternatives && alternatives.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Alternatives</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {alternatives.map((alt) => (
                      <ToolCard
                        key={alt.id}
                        id={alt.id}
                        name={alt.name}
                        slug={alt.slug}
                        shortDescription={alt.short_description || undefined}
                        logoUrl={alt.logo_url || undefined}
                        websiteUrl={alt.website_url || undefined}
                        pricingType={alt.pricing_type}
                        avgRating={Number(alt.avg_rating) || 0}
                        ratingCount={alt.rating_count}
                        categoryName={(alt.categories as any)?.name}
                      />
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Find Similar with AI */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => navigate(`/tools?q=${encodeURIComponent(`Similar to ${tool.name}`)}`)}
              >
                <Sparkles className="h-4 w-4" />
                Tìm tool tương tự bằng AI
              </Button>

              {/* Compare */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => navigate(`/compare?tools=${tool.id}`)}
              >
                <GitCompareArrows className="h-4 w-4" />
                So sánh với tool khác
              </Button>

              {/* Pricing History */}
              <PricingHistoryChart toolId={tool.id} toolName={tool.name} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
