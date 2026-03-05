import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ToolCard } from "@/components/tools/ToolCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";

export default function TasksPage() {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const selectedTaskData = tasks?.find((t) => t.id === selectedTask);

  const { data: toolsForTask, isLoading: toolsLoading } = useQuery({
    queryKey: ["task-tools", selectedTask],
    queryFn: async () => {
      // Get tool_ids mapped to this task
      const { data: mappings, error: mapErr } = await supabase
        .from("tool_tasks")
        .select("tool_id")
        .eq("task_id", selectedTask!)
        .order("relevance_score", { ascending: false });
      if (mapErr) throw mapErr;

      if (!mappings || mappings.length === 0) {
        // Fallback: find tools in similar category by keyword match
        const taskName = selectedTaskData?.name || "";
        const { data, error } = await supabase
          .from("tools")
          .select("*, categories(name), ai_scores(overall_score, is_recommended)")
          .eq("status", "published")
          .or(`name.ilike.%${taskName}%,short_description.ilike.%${taskName}%,description.ilike.%${taskName}%`)
          .order("view_count", { ascending: false })
          .limit(12);
        if (error) throw error;
        return data;
      }

      const toolIds = mappings.map((m) => m.tool_id);
      const { data, error } = await supabase
        .from("tools")
        .select("*, categories(name), ai_scores(overall_score, is_recommended)")
        .eq("status", "published")
        .in("id", toolIds)
        .order("view_count", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTask,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SEOHead
        title="Tìm tool theo công việc - ToolScope"
        description="Chọn task bạn cần làm và tìm ngay công cụ phù hợp nhất. Generate images, Write content, Build website và hơn thế nữa."
      />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container py-8">
          {!selectedTask ? (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Bạn muốn làm gì?
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                  Chọn task và tìm ngay công cụ phù hợp nhất
                </p>
              </div>

              {tasksLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {tasks?.map((task) => (
                    <Card
                      key={task.id}
                      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
                      onClick={() => setSelectedTask(task.id)}
                    >
                      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                        <span className="text-4xl mb-3">{task.icon}</span>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {task.name}
                        </h3>
                        {task.description && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        {(task.tool_count ?? 0) > 0 && (
                          <span className="mt-2 text-[11px] text-muted-foreground">
                            {task.tool_count} công cụ
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="mb-4 gap-1.5"
                onClick={() => setSelectedTask(null)}
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>

              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedTaskData?.icon}</span>
                  <div>
                    <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {selectedTaskData?.name}
                    </h1>
                    {selectedTaskData?.description && (
                      <p className="text-muted-foreground">{selectedTaskData.description}</p>
                    )}
                  </div>
                </div>
              </div>

              {toolsLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              ) : toolsForTask && toolsForTask.length > 0 ? (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">{toolsForTask.length} công cụ phù hợp</p>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {toolsForTask.map((tool) => (
                      <ToolCard
                        key={tool.id}
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
                        isTrending={tool.is_trending}
                        isAiRecommended={(tool.ai_scores as any)?.is_recommended}
                        aiScore={(tool.ai_scores as any)?.overall_score ? Number((tool.ai_scores as any).overall_score) : undefined}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
                  <Search className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-3 text-lg font-medium">Chưa có công cụ nào cho task này</p>
                  <p className="mt-1 text-sm text-muted-foreground">Hãy thử tìm kiếm trên trang khám phá</p>
                  <Link to="/tools">
                    <Button className="mt-4" size="sm">Khám phá công cụ</Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
