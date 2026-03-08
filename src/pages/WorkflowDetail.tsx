import { useParams, Link } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SEOHead } from "@/components/seo/SEOHead";
import { ToolCard } from "@/components/tools/ToolCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShareButtons } from "@/components/share/ShareButtons";
import { ArrowLeft, Eye, Workflow, CheckCircle2, AlertTriangle, Lightbulb, Target, Clock, BarChart3, Users, Play, ListChecks, Zap } from "lucide-react";
import { UpvoteButton } from "@/components/UpvoteButton";
import { useI18n } from "@/lib/i18n";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? "";
}

export default function WorkflowDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();

  const difficultyLabel: Record<string, { label: string; color: string }> = {
    beginner: { label: t("workflow.beginner"), color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    intermediate: { label: t("workflow.intermediate"), color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    advanced: { label: t("workflow.advanced"), color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };

  const { data: wf, isLoading } = useQuery({
    queryKey: ["workflow", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("workflows").select("*, profiles(display_name, avatar_url)").eq("slug", slug!).eq("status", "published").maybeSingle();
      if (error) throw error;
      if (data) { supabase.from("workflows").update({ view_count: (data.view_count ?? 0) + 1 } as any).eq("id", data.id).then(); }
      return data;
    },
    enabled: !!slug,
  });

  const steps = (wf?.steps as any[]) ?? [];
  const seo = (wf as any)?.seo_content || {};

  // Build dynamic translation fields including steps + seo_content
  const baseFields = ["title", "description", "seo_title", "seo_description", "seo_content_problem", "seo_content_solution", "seo_content_target_audience"];
  const stepFields = steps.flatMap((_: any, i: number) => [`step_${i}_title`, `step_${i}_description`]);
  const allTranslationFields = [...baseFields, ...stepFields];

  const baseFallbacks: Record<string, string | null | undefined> = {
    title: wf?.title,
    description: wf?.description,
    seo_title: (wf as any)?.seo_title,
    seo_description: (wf as any)?.seo_description,
    seo_content_problem: seo.problem,
    seo_content_solution: seo.solution,
    seo_content_target_audience: seo.target_audience,
  };
  steps.forEach((s: any, i: number) => {
    baseFallbacks[`step_${i}_title`] = s.title;
    baseFallbacks[`step_${i}_description`] = s.description;
  });

  const { translated, isTranslated } = useTranslatedContent("workflow", wf?.id, allTranslationFields, baseFallbacks);

  const toolIds = (wf?.tool_ids as string[]) ?? [];
  const { data: tools = [] } = useQuery({
    queryKey: ["workflow-tools", toolIds],
    queryFn: async () => { if (!toolIds.length) return []; const { data } = await supabase.from("tools").select("*, categories(name)").in("id", toolIds); return data ?? []; },
    enabled: toolIds.length > 0,
  });

  const videoUrl = (wf as any)?.video_url;

  useEffect(() => {
    const mistakes = seo.common_mistakes as { title: string; description: string }[] | undefined;
    if (!mistakes?.length) return;
    const script = document.createElement("script"); script.type = "application/ld+json"; script.id = "workflow-faq-schema";
    script.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: mistakes.map((m) => ({ "@type": "Question", name: m.title, acceptedAnswer: { "@type": "Answer", text: m.description } })) });
    document.head.appendChild(script);
    return () => { document.getElementById("workflow-faq-schema")?.remove(); };
  }, [seo.common_mistakes]);

  useEffect(() => {
    if (!steps.length || !wf) return;
    const script = document.createElement("script"); script.type = "application/ld+json"; script.id = "workflow-howto-schema";
    script.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "HowTo", name: translated.title || wf.title, description: translated.description || wf.description || "", ...(seo.estimated_time ? { totalTime: seo.estimated_time } : {}), step: steps.map((s: any, i: number) => ({ "@type": "HowToStep", position: i + 1, name: translated[`step_${i}_title`] || s.title, text: translated[`step_${i}_description`] || s.description || "" })) });
    document.head.appendChild(script);
    return () => { document.getElementById("workflow-howto-schema")?.remove(); };
  }, [steps, wf, translated]);

  if (isLoading) return (<div className="flex min-h-screen flex-col"><Header /><main className="flex-1 container max-w-4xl py-8"><Skeleton className="h-8 w-64 mb-4" /><Skeleton className="h-48 rounded-xl mb-4" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-3/4" /></main><Footer /></div>);

  if (!wf) return (<div className="flex min-h-screen flex-col"><Header /><main className="flex-1 container py-16 text-center"><Workflow className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" /><p className="text-xl text-muted-foreground">{t("workflow.notFound")}</p><Link to="/workflows" className="mt-4 inline-block text-primary hover:underline">← {t("workflow.backToList")}</Link></main><Footer /></div>);

  const displayTitle = translated.title || wf.title;
  const displayDesc = translated.description || wf.description;
  const seoTitle = translated.seo_title || (wf as any)?.seo_title || wf.title;
  const seoDesc = translated.seo_description || (wf as any)?.seo_description || wf.description || `Workflow: ${wf.title}`;
  const difficulty = difficultyLabel[seo.difficulty_level] || null;

  const displayProblem = translated.seo_content_problem || seo.problem;
  const displaySolution = translated.seo_content_solution || seo.solution;
  const displayTargetAudience = translated.seo_content_target_audience || seo.target_audience;

  return (
    <div className="flex min-h-screen flex-col">
      <SEOHead title={`${seoTitle} - ToolScope`} description={seoDesc} />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <article className="container max-w-4xl py-8">
          <Link to="/workflows" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("workflow.backToList")}
          </Link>

          {wf.cover_image_url && (<div className="mb-6 aspect-video overflow-hidden rounded-xl"><img src={wf.cover_image_url} alt={displayTitle} className="h-full w-full object-cover" /></div>)}

          <h1 className="text-3xl font-bold leading-tight md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{displayTitle}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {wf.category && <Badge variant="secondary">{wf.category}</Badge>}
            {difficulty && <Badge className={`${difficulty.color} text-xs`}>{difficulty.label}</Badge>}
            {seo.estimated_time && (<span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {seo.estimated_time}</span>)}
            <UpvoteButton targetId={wf.id} targetType="workflow" currentUpvotes={wf.upvotes ?? 0} tableName="workflows" />
            <span className="flex items-center gap-1.5 text-muted-foreground"><Eye className="h-4 w-4" /> {wf.view_count ?? 0}</span>
            <ShareButtons title={displayTitle} />
          </div>

          {displayDesc && (<p className="mt-4 text-lg text-muted-foreground leading-relaxed">{displayDesc}</p>)}

          {(displayProblem || displaySolution) && (
            <div className="grid gap-4 md:grid-cols-2 mt-6">
              {displayProblem && (<Card className="border-destructive/20 bg-destructive/5"><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-destructive" /> {t("workflow.problem")}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground leading-relaxed">{displayProblem}</p></CardContent></Card>)}
              {displaySolution && (<Card className="border-primary/20 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> {t("workflow.solution")}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground leading-relaxed">{displaySolution}</p></CardContent></Card>)}
            </div>
          )}

          {(displayTargetAudience || seo.prerequisites?.length > 0 || seo.use_cases?.length > 0) && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {displayTargetAudience && (<Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm font-medium mb-1.5"><Users className="h-4 w-4 text-muted-foreground" /> {t("workflow.targetAudience")}</div><p className="text-sm text-muted-foreground">{displayTargetAudience}</p></CardContent></Card>)}
              {seo.prerequisites?.length > 0 && (<Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm font-medium mb-1.5"><ListChecks className="h-4 w-4 text-muted-foreground" /> {t("workflow.prerequisites")}</div><ul className="text-sm text-muted-foreground space-y-0.5">{(seo.prerequisites as string[]).map((p, i) => (<li key={i} className="flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span> {p}</li>))}</ul></CardContent></Card>)}
              {seo.use_cases?.length > 0 && (<Card><CardContent className="p-4"><div className="flex items-center gap-2 text-sm font-medium mb-1.5"><BarChart3 className="h-4 w-4 text-muted-foreground" /> {t("workflow.useCases")}</div><ul className="text-sm text-muted-foreground space-y-0.5">{(seo.use_cases as string[]).map((u, i) => (<li key={i} className="flex items-start gap-1.5"><span className="text-primary mt-0.5">•</span> {u}</li>))}</ul></CardContent></Card>)}
            </div>
          )}

          {steps.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> {t("workflow.steps")} ({steps.length} {t("workflow.stepsCount")})</h2>
              <div className="relative space-y-0">
                {steps.map((step: any, i: number) => {
                  const stepTool = step.tool_id ? tools.find((t: any) => t.id === step.tool_id) : null;
                  const stepTitle = translated[`step_${i}_title`] || step.title;
                  const stepDesc = translated[`step_${i}_description`] || step.description;
                  return (
                    <div key={i} className="relative flex gap-4 pb-8 last:pb-0">
                      {i < steps.length - 1 && (<div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border" />)}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm z-10">{i + 1}</div>
                      <div className="flex-1 pt-1">
                        <h3 className="font-semibold text-foreground">{stepTitle}</h3>
                        {stepDesc && (<p className="mt-1 text-sm text-muted-foreground leading-relaxed">{stepDesc}</p>)}
                        {stepTool && (<div className="mt-3"><ToolCard id={stepTool.id} name={stepTool.name} slug={stepTool.slug} shortDescription={stepTool.short_description} logoUrl={stepTool.logo_url} websiteUrl={stepTool.website_url} pricingType={stepTool.pricing_type} avgRating={stepTool.avg_rating ?? 0} ratingCount={stepTool.rating_count ?? 0} categoryName={stepTool.categories?.name} /></div>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(seo.common_mistakes?.length > 0 || seo.tips?.length > 0 || videoUrl) && (
            <div className="mt-10">
              <Accordion type="multiple" defaultValue={["mistakes", "tips", "video"]} className="w-full">
                {seo.common_mistakes?.length > 0 && (<AccordionItem value="mistakes"><AccordionTrigger className="text-left"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> ⚠️ {t("workflow.commonMistakes")} ({(seo.common_mistakes as any[]).length})</span></AccordionTrigger><AccordionContent><div className="space-y-3">{(seo.common_mistakes as { title: string; description: string }[]).map((m, i) => (<div key={i} className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/30 dark:bg-amber-900/10"><span className="text-amber-500 font-bold shrink-0">#{i + 1}</span><div><p className="font-medium text-sm">{m.title}</p>{m.description && <p className="text-sm text-muted-foreground mt-0.5">{m.description}</p>}</div></div>))}</div></AccordionContent></AccordionItem>)}
                {seo.tips?.length > 0 && (<AccordionItem value="tips"><AccordionTrigger className="text-left"><span className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" /> 💡 {t("workflow.proTips")} ({(seo.tips as any[]).length})</span></AccordionTrigger><AccordionContent><div className="space-y-3">{(seo.tips as { title: string; description: string }[]).map((tip, i) => (<div key={i} className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3"><span className="text-primary font-bold shrink-0">💡</span><div><p className="font-medium text-sm">{tip.title}</p>{tip.description && <p className="text-sm text-muted-foreground mt-0.5">{tip.description}</p>}</div></div>))}</div></AccordionContent></AccordionItem>)}
                {videoUrl && (<AccordionItem value="video"><AccordionTrigger className="text-left"><span className="flex items-center gap-2"><Play className="h-4 w-4 text-red-500" /> 🎬 {t("workflow.videoGuide")}</span></AccordionTrigger><AccordionContent>{videoUrl.includes("youtu") ? (<div className="aspect-video rounded-lg overflow-hidden border"><iframe src={`https://www.youtube.com/embed/${extractYouTubeId(videoUrl)}`} className="w-full h-full" allowFullScreen title={t("workflow.videoGuide")} loading="lazy" /></div>) : (<a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t("workflow.watchVideo")}</a>)}</AccordionContent></AccordionItem>)}
              </Accordion>
            </div>
          )}

          {tools.length > 0 && (
            <div className="mt-12 border-t pt-8">
              <h2 className="text-xl font-bold mb-4">🔗 {t("workflow.relatedTools")}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {tools.map((tool: any) => (<ToolCard key={tool.id} id={tool.id} name={tool.name} slug={tool.slug} shortDescription={tool.short_description} logoUrl={tool.logo_url} websiteUrl={tool.website_url} pricingType={tool.pricing_type} avgRating={tool.avg_rating ?? 0} ratingCount={tool.rating_count ?? 0} categoryName={tool.categories?.name} />))}
              </div>
            </div>
          )}
        </article>
      </main>
      <Footer /><MobileBottomNav />
    </div>
  );
}
