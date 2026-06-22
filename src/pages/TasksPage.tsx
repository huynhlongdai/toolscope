import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useTranslatedList } from "@/hooks/useTranslatedContent";
import { PageLayout } from "@/components/layout/PageLayout";
import { ToolCard } from "@/components/tools/ToolCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Star, SlidersHorizontal } from "lucide-react";
import { ShareButtons } from "@/components/share/ShareButtons";
import { TaskSuggestDialog } from "@/components/tasks/TaskSuggestDialog";

type SortOption = "popular" | "az" | "newest";

export default function TasksPage() {
  const { t } = useI18n();
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [toolSort, setToolSort] = useState<string>("relevance");
  const [toolPricing, setToolPricing] = useState<string>("all");

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

  // Live tool counts from tool_tasks
  const { data: toolCounts = {} } = useQuery({
    queryKey: ["task-tool-counts-public"],
    queryFn: async () => {
      const { data } = await supabase.from("tool_tasks").select("task_id");
      if (!data) return {};
      const counts: Record<string, number> = {};
      data.forEach((t: any) => { counts[t.task_id] = (counts[t.task_id] || 0) + 1; });
      return counts;
    },
  });

  const taskIds = useMemo(() => tasks?.map((t) => t.id) || [], [tasks]);
  const taskFallbacks = useMemo(() => {
    const fb: Record<string, Record<string, string | null | undefined>> = {};
    tasks?.forEach((t) => { fb[t.id] = { name: t.name, description: t.description }; });
    return fb;
  }, [tasks]);

  const { translationsMap } = useTranslatedList("task", taskIds, ["name", "description"], taskFallbacks);

  const getTaskName = (task: any) => translationsMap[task.id]?.name || task.name;
  const getTaskDesc = (task: any) => translationsMap[task.id]?.description || task.description;

  // Filter & sort tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let list = tasks.filter((t) => {
      if (!search) return true;
      const name = getTaskName(t).toLowerCase();
      return name.includes(search.toLowerCase());
    });
    switch (sortBy) {
      case "az":
        list = [...list].sort((a, b) => getTaskName(a).localeCompare(getTaskName(b)));
        break;
      case "newest":
        list = [...list].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case "popular":
      default:
        list = [...list].sort((a, b) => ((toolCounts as any)[b.id] || 0) - ((toolCounts as any)[a.id] || 0));
        break;
    }
    return list;
  }, [tasks, search, sortBy, toolCounts, translationsMap]);

  const featuredTasks = useMemo(() => filteredTasks.filter((t: any) => t.is_featured), [filteredTasks]);
  const regularTasks = useMemo(() => filteredTasks.filter((t: any) => !t.is_featured), [filteredTasks]);

  // Group by parent
  const groupedTasks = useMemo(() => {
    const parents = regularTasks.filter((t: any) => !t.parent_id);
    const children = regularTasks.filter((t: any) => t.parent_id);
    const groups: { parent: any | null; items: any[] }[] = [];

    const childMap: Record<string, any[]> = {};
    children.forEach((c) => {
      if (!childMap[c.parent_id!]) childMap[c.parent_id!] = [];
      childMap[c.parent_id!].push(c);
    });

    const parentIds = new Set(parents.map((p) => p.id));
    const orphans = children.filter((c) => !parentIds.has(c.parent_id!));

    parents.forEach((p) => {
      const kids = childMap[p.id] || [];
      if (kids.length > 0) {
        // Parent has children → show parent as heading, children as cards
        groups.push({ parent: p, items: kids });
      } else {
        // Parent without children → show as standalone card (no heading)
        groups.push({ parent: null, items: [p] });
      }
    });

    if (orphans.length > 0) {
      groups.push({ parent: null, items: orphans });
    }

    return groups;
  }, [regularTasks]);

  const selectedTaskData = tasks?.find((t) => t.id === selectedTask);

  const { data: toolsForTask, isLoading: toolsLoading } = useQuery({
    queryKey: ["task-tools", selectedTask],
    queryFn: async () => {
      const { data: mappings, error: mapErr } = await supabase
        .from("tool_tasks")
        .select("tool_id")
        .eq("task_id", selectedTask!)
        .order("relevance_score", { ascending: false });
      if (mapErr) throw mapErr;

      if (!mappings || mappings.length === 0) {
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

  // Filter/sort tools in detail view
  const displayedTools = useMemo(() => {
    if (!toolsForTask) return [];
    let list = [...toolsForTask];
    if (toolPricing !== "all") {
      list = list.filter((t) => t.pricing_type === toolPricing);
    }
    switch (toolSort) {
      case "rating":
        list.sort((a, b) => (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0));
        break;
      case "newest":
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    return list;
  }, [toolsForTask, toolSort, toolPricing]);

  const renderTaskCard = (task: any, featured = false) => (
    <Card
      key={task.id}
      className={`group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 ${featured ? "border-primary/20 bg-primary/5" : ""}`}
      onClick={() => setSelectedTask(task.id)}
    >
      <CardContent className={`flex flex-col items-center justify-center text-center ${featured ? "p-8" : "p-6"}`}>
        <span className={featured ? "text-5xl mb-3" : "text-4xl mb-3"}>{task.icon}</span>
        <h3 className={`font-semibold text-foreground group-hover:text-primary transition-colors ${featured ? "text-lg" : ""}`}>
          {getTaskName(task)}
        </h3>
        {getTaskDesc(task) && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{getTaskDesc(task)}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="secondary" className="text-[11px]">
            {(toolCounts as any)[task.id] || task.tool_count || 0} tools
          </Badge>
          {featured && <Badge className="text-[11px] bg-primary/10 text-primary border-primary/20">⭐ Featured</Badge>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PageLayout title={t("tasks.seoTitle")} description={t("tasks.seoDesc")}>
        <div className="container py-8">
          {!selectedTask ? (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold md:text-4xl">
                  {t("tasks.title")}
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">{t("tasks.subtitle")}</p>
              </div>

              {/* Search, Sort, Suggest */}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("tasks.searchPlaceholder") || "Tìm task..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="popular">Phổ biến</SelectItem>
                      <SelectItem value="az">A → Z</SelectItem>
                      <SelectItem value="newest">Mới nhất</SelectItem>
                    </SelectContent>
                  </Select>
                  <TaskSuggestDialog />
                </div>
              </div>

              {tasksLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Featured Section */}
                  {featuredTasks.length > 0 && (
                    <div className="mb-8">
                      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                        <Star className="h-5 w-5 text-primary" /> Featured Tasks
                      </h2>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {featuredTasks.map((task) => renderTaskCard(task, true))}
                      </div>
                    </div>
                  )}

                  {/* Regular Tasks (grouped) */}
                  {groupedTasks.length > 0 ? (
                    <>
                      {/* Groups with parent headings */}
                      {groupedTasks.filter(g => g.parent).map((group, gi) => (
                        <div key={`headed-${gi}`} className="mb-6">
                          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                            <span>{group.parent.icon}</span> {getTaskName(group.parent)}
                          </h2>
                          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {group.items.map((task) => renderTaskCard(task))}
                          </div>
                        </div>
                      ))}
                      {/* Standalone cards in one grid */}
                      {groupedTasks.filter(g => !g.parent).flatMap(g => g.items).length > 0 && (
                        <div className="mb-6">
                          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {groupedTasks.filter(g => !g.parent).flatMap(g => g.items).map((task) => renderTaskCard(task))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    !featuredTasks.length && (
                      <div className="text-center py-16 text-muted-foreground">
                        {search ? "Không tìm thấy task nào" : "Chưa có task nào"}
                      </div>
                    )
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { setSelectedTask(null); setToolSort("relevance"); setToolPricing("all"); }}>
                  <ArrowLeft className="h-4 w-4" />
                  {t("tasks.back")}
                </Button>
                <ShareButtons title={selectedTaskData ? getTaskName(selectedTaskData) : ""} />
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedTaskData?.icon}</span>
                  <div>
                    <h1 className="text-2xl font-bold">
                      {selectedTaskData ? getTaskName(selectedTaskData) : ""}
                    </h1>
                    {selectedTaskData && getTaskDesc(selectedTaskData) && (
                      <p className="text-muted-foreground">{getTaskDesc(selectedTaskData)}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tool filters */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <Select value={toolSort} onValueChange={setToolSort}>
                  <SelectTrigger className="w-[130px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Phù hợp nhất</SelectItem>
                    <SelectItem value="rating">Đánh giá cao</SelectItem>
                    <SelectItem value="newest">Mới nhất</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={toolPricing} onValueChange={setToolPricing}>
                  <SelectTrigger className="w-[120px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="free">Miễn phí</SelectItem>
                    <SelectItem value="freemium">Freemium</SelectItem>
                    <SelectItem value="paid">Trả phí</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {toolsLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              ) : displayedTools.length > 0 ? (
                <>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {t("tasks.matchCount").replace("{count}", String(displayedTools.length))}
                  </p>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {displayedTools.map((tool) => (
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
                  <p className="mt-3 text-lg font-medium">{t("tasks.noTools")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t("tasks.noToolsHint")}</p>
                  <Link to="/tools">
                    <Button className="mt-4" size="sm">{t("tasks.explore")}</Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
    </PageLayout>
  );
}
