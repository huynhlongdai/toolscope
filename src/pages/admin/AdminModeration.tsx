import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Check, X, Wrench, MessageSquare, HelpCircle, Shield, Plus, Trash2, AlertTriangle, Ban, Rocket } from "lucide-react";
import { logAuditAction } from "@/hooks/useAuditLog";

const BLACKLIST_KEY = "moderation_blacklist";

function BulkActionBar({ count, total, onClear, children }: { count: number; total: number; onClear: () => void; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <Card><CardContent className="py-3 flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium">{count}/{total} đã chọn</span>
      {children}
      <Button size="sm" variant="ghost" onClick={onClear}>Bỏ chọn</Button>
    </CardContent></Card>
  );
}

function SelectAllCheckbox({ items, selected, setSelected }: { items: any[]; selected: Set<string>; setSelected: (s: Set<string>) => void }) {
  const allSelected = items.length > 0 && items.every((i: any) => selected.has(i.id));
  const someSelected = items.some((i: any) => selected.has(i.id));
  return (
    <Checkbox
      checked={allSelected ? true : someSelected ? "indeterminate" : false}
      onCheckedChange={() => {
        if (allSelected) setSelected(new Set());
        else setSelected(new Set(items.map((i: any) => i.id)));
      }}
    />
  );
}

export default function AdminModeration() {
  const queryClient = useQueryClient();
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [selectedLaunchComments, setSelectedLaunchComments] = useState<Set<string>>(new Set());
  const [selectedFlagged, setSelectedFlagged] = useState<Set<string>>(new Set());

  const { data: pendingTools = [] } = useQuery({
    queryKey: ["mod-pending-tools"],
    queryFn: async () => {
      const { data } = await supabase.from("tools").select("*").eq("status", "pending_review").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: pendingReviews = [] } = useQuery({
    queryKey: ["mod-pending-reviews"],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("*, profiles!reviews_author_id_fkey(display_name), tools!reviews_tool_id_fkey(name)").eq("status", "pending_review").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: recentComments = [] } = useQuery({
    queryKey: ["mod-recent-comments"],
    queryFn: async () => {
      const { data } = await supabase.from("comments").select("*, profiles!comments_user_id_fkey(display_name), tools!comments_tool_id_fkey(name)").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: pendingQuestions = [] } = useQuery({
    queryKey: ["mod-pending-questions"],
    queryFn: async () => {
      const { data } = await supabase.from("questions").select("*, profiles:user_id(display_name), tools:tool_id(name)").order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const { data: recentLaunchComments = [] } = useQuery({
    queryKey: ["mod-launch-comments"],
    queryFn: async () => {
      const { data } = await supabase.from("launch_comments").select("*, launches:launch_id(tagline, product_name)").order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const { data: pendingReports = [] } = useQuery({
    queryKey: ["mod-pending-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("id").eq("status", "pending");
      return data ?? [];
    },
  });

  const { data: blacklist = [] } = useQuery({
    queryKey: ["mod-blacklist"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", BLACKLIST_KEY).single();
      return (data?.value as string[]) ?? [];
    },
  });

  const flaggedComments = useMemo(() => {
    if (!blacklist.length) return [];
    return recentComments.filter((c: any) => {
      const content = c.content?.toLowerCase() ?? "";
      return blacklist.some((kw: string) => content.includes(kw.toLowerCase()));
    });
  }, [recentComments, blacklist]);

  // --- Single mutations ---
  const approveTool = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("tools").update({ status: "published" as any }).eq("id", id); if (error) throw error; },
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ["mod-pending-tools"] }); logAuditAction("tool_approve", "tool", id); toast.success("Đã duyệt tool"); },
  });

  const rejectTool = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("tools").update({ status: "archived" as any }).eq("id", id); if (error) throw error; },
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ["mod-pending-tools"] }); logAuditAction("tool_reject", "tool", id); toast.success("Đã từ chối tool"); },
  });

  const approveReview = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("reviews").update({ status: "published" as any }).eq("id", id); if (error) throw error; },
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ["mod-pending-reviews"] }); logAuditAction("review_approve", "review", id); toast.success("Đã duyệt review"); },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("comments").delete().eq("id", id); if (error) throw error; },
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ["mod-recent-comments"] }); logAuditAction("comment_delete", "comment", id); toast.success("Đã xóa comment"); },
  });

  const deleteLaunchComment = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("launch_comments").delete().eq("id", id); if (error) throw error; },
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ["mod-launch-comments"] }); logAuditAction("launch_comment_delete", "launch_comment", id); toast.success("Đã xóa comment"); },
  });

  const quickBanUser = async (userId: string) => {
    if (!confirm("Ban user này?")) return;
    await supabase.from("profiles").update({ is_banned: true } as any).eq("id", userId);
    logAuditAction("user_quick_ban", "user", userId);
    toast.success("Đã ban user");
  };

  // --- Bulk actions ---
  const bulkApproveTools = async () => {
    const ids = Array.from(selectedTools);
    if (!ids.length || !confirm(`Duyệt ${ids.length} tools?`)) return;
    for (const id of ids) await supabase.from("tools").update({ status: "published" as any }).eq("id", id);
    logAuditAction("tool_bulk_approve", "tool", undefined, { count: ids.length });
    queryClient.invalidateQueries({ queryKey: ["mod-pending-tools"] });
    setSelectedTools(new Set());
    toast.success(`Đã duyệt ${ids.length} tools`);
  };

  const bulkRejectTools = async () => {
    const ids = Array.from(selectedTools);
    if (!ids.length || !confirm(`Từ chối ${ids.length} tools?`)) return;
    for (const id of ids) await supabase.from("tools").update({ status: "archived" as any }).eq("id", id);
    logAuditAction("tool_bulk_reject", "tool", undefined, { count: ids.length });
    queryClient.invalidateQueries({ queryKey: ["mod-pending-tools"] });
    setSelectedTools(new Set());
    toast.success(`Đã từ chối ${ids.length} tools`);
  };

  const bulkApproveReviews = async () => {
    const ids = Array.from(selectedReviews);
    if (!ids.length || !confirm(`Duyệt ${ids.length} reviews?`)) return;
    for (const id of ids) await supabase.from("reviews").update({ status: "published" as any }).eq("id", id);
    logAuditAction("review_bulk_approve", "review", undefined, { count: ids.length });
    queryClient.invalidateQueries({ queryKey: ["mod-pending-reviews"] });
    setSelectedReviews(new Set());
    toast.success(`Đã duyệt ${ids.length} reviews`);
  };

  const bulkRejectReviews = async () => {
    const ids = Array.from(selectedReviews);
    if (!ids.length || !confirm(`Từ chối & xóa ${ids.length} reviews?`)) return;
    for (const id of ids) await supabase.from("reviews").delete().eq("id", id);
    logAuditAction("review_bulk_reject", "review", undefined, { count: ids.length });
    queryClient.invalidateQueries({ queryKey: ["mod-pending-reviews"] });
    setSelectedReviews(new Set());
    toast.success(`Đã xóa ${ids.length} reviews`);
  };

  const bulkDeleteComments = async () => {
    const ids = Array.from(selectedComments);
    if (!ids.length || !confirm(`Xóa ${ids.length} comments?`)) return;
    for (const id of ids) await supabase.from("comments").delete().eq("id", id);
    logAuditAction("comment_bulk_delete", "comment", undefined, { count: ids.length });
    queryClient.invalidateQueries({ queryKey: ["mod-recent-comments"] });
    setSelectedComments(new Set());
    toast.success(`Đã xóa ${ids.length} comments`);
  };

  const bulkDeleteQuestions = async () => {
    const ids = Array.from(selectedQuestions);
    if (!ids.length || !confirm(`Xóa ${ids.length} câu hỏi?`)) return;
    for (const id of ids) await supabase.from("questions").delete().eq("id", id);
    logAuditAction("question_bulk_delete", "question", undefined, { count: ids.length });
    queryClient.invalidateQueries({ queryKey: ["mod-pending-questions"] });
    setSelectedQuestions(new Set());
    toast.success(`Đã xóa ${ids.length} câu hỏi`);
  };

  const bulkDeleteLaunchComments = async () => {
    const ids = Array.from(selectedLaunchComments);
    if (!ids.length || !confirm(`Xóa ${ids.length} launch comments?`)) return;
    for (const id of ids) await supabase.from("launch_comments").delete().eq("id", id);
    logAuditAction("launch_comment_bulk_delete", "launch_comment", undefined, { count: ids.length });
    queryClient.invalidateQueries({ queryKey: ["mod-launch-comments"] });
    setSelectedLaunchComments(new Set());
    toast.success(`Đã xóa ${ids.length} launch comments`);
  };

  const bulkDeleteFlagged = async () => {
    const ids = Array.from(selectedFlagged);
    if (!ids.length || !confirm(`Xóa ${ids.length} flagged comments?`)) return;
    for (const id of ids) await supabase.from("comments").delete().eq("id", id);
    logAuditAction("flagged_bulk_delete", "comment", undefined, { count: ids.length });
    queryClient.invalidateQueries({ queryKey: ["mod-recent-comments"] });
    setSelectedFlagged(new Set());
    toast.success(`Đã xóa ${ids.length} flagged comments`);
  };

  const bulkBanFlaggedUsers = async () => {
    const userIds = new Set<string>();
    flaggedComments.forEach((c: any) => { if (selectedFlagged.has(c.id) && c.user_id) userIds.add(c.user_id); });
    const ids = Array.from(userIds);
    if (!ids.length || !confirm(`Ban ${ids.length} users từ flagged comments?`)) return;
    for (const uid of ids) await supabase.from("profiles").update({ is_banned: true } as any).eq("id", uid);
    logAuditAction("flagged_bulk_ban", "user", undefined, { count: ids.length });
    toast.success(`Đã ban ${ids.length} users`);
  };

  // --- Toggle helpers ---
  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); setter(n);
  };

  // --- Blacklist ---
  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    const updated = [...new Set([...blacklist, newKeyword.trim().toLowerCase()])];
    await supabase.from("site_settings").upsert({ key: BLACKLIST_KEY, value: updated as any });
    queryClient.invalidateQueries({ queryKey: ["mod-blacklist"] });
    logAuditAction("blacklist_add", "moderation", undefined, { keyword: newKeyword });
    setNewKeyword("");
    toast.success("Đã thêm keyword");
  };

  const removeKeyword = async (kw: string) => {
    const updated = blacklist.filter((k: string) => k !== kw);
    await supabase.from("site_settings").upsert({ key: BLACKLIST_KEY, value: updated as any });
    queryClient.invalidateQueries({ queryKey: ["mod-blacklist"] });
    toast.success("Đã xóa keyword");
  };

  const totalPending = pendingTools.length + pendingReviews.length;

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Moderation Queue</h1>
            {totalPending > 0 && <Badge variant="destructive">{totalPending} chờ duyệt</Badge>}
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowBlacklistDialog(true)}><Shield className="mr-1 h-3.5 w-3.5" /> Blacklist ({blacklist.length})</Button>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><Wrench className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Pending Tools</span></div>
            <p className="text-2xl font-bold mt-1">{pendingTools.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Pending Reviews</span></div>
            <p className="text-2xl font-bold mt-1">{pendingReviews.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">Flagged</span></div>
            <p className="text-2xl font-bold mt-1">{flaggedComments.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><HelpCircle className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Questions</span></div>
            <p className="text-2xl font-bold mt-1">{pendingQuestions.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Reports</span></div>
            <p className="text-2xl font-bold mt-1">{pendingReports.length}</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="tools">
          <TabsList className="flex-wrap">
            <TabsTrigger value="tools"><Wrench className="mr-1 h-4 w-4" /> Tools ({pendingTools.length})</TabsTrigger>
            <TabsTrigger value="reviews"><MessageSquare className="mr-1 h-4 w-4" /> Reviews ({pendingReviews.length})</TabsTrigger>
            <TabsTrigger value="comments"><MessageSquare className="mr-1 h-4 w-4" /> Comments</TabsTrigger>
            <TabsTrigger value="questions"><HelpCircle className="mr-1 h-4 w-4" /> Questions</TabsTrigger>
            <TabsTrigger value="launch-comments"><Rocket className="mr-1 h-4 w-4" /> Launches</TabsTrigger>
            <TabsTrigger value="flagged"><AlertTriangle className="mr-1 h-4 w-4" /> Flagged ({flaggedComments.length})</TabsTrigger>
          </TabsList>

          {/* Tools tab */}
          <TabsContent value="tools" className="space-y-4 mt-4">
            <BulkActionBar count={selectedTools.size} total={pendingTools.length} onClear={() => setSelectedTools(new Set())}>
              <Button size="sm" onClick={bulkApproveTools}><Check className="mr-1 h-3.5 w-3.5" /> Duyệt</Button>
              <Button size="sm" variant="destructive" onClick={bulkRejectTools}><X className="mr-1 h-3.5 w-3.5" /> Từ chối</Button>
            </BulkActionBar>
            {pendingTools.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Không có tool nào chờ duyệt 🎉</p>
            ) : (
              <>
                <div className="flex items-center gap-2 px-1">
                  <SelectAllCheckbox items={pendingTools} selected={selectedTools} setSelected={setSelectedTools} />
                  <span className="text-sm text-muted-foreground">Chọn tất cả</span>
                </div>
                {pendingTools.map((tool: any) => (
                  <Card key={tool.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={selectedTools.has(tool.id)} onCheckedChange={() => toggle(selectedTools, tool.id, setSelectedTools)} />
                          <div>
                            <CardTitle className="text-lg">{tool.name}</CardTitle>
                            <CardDescription>{tool.short_description ?? tool.description?.slice(0, 100)}</CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveTool.mutate(tool.id)}><Check className="mr-1 h-4 w-4" /> Duyệt</Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectTool.mutate(tool.id)}><X className="mr-1 h-4 w-4" /> Từ chối</Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>Website: {tool.website_url ?? "—"} | Pricing: {tool.pricing_type}</p>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          {/* Reviews tab */}
          <TabsContent value="reviews" className="space-y-4 mt-4">
            <BulkActionBar count={selectedReviews.size} total={pendingReviews.length} onClear={() => setSelectedReviews(new Set())}>
              <Button size="sm" onClick={bulkApproveReviews}><Check className="mr-1 h-3.5 w-3.5" /> Duyệt</Button>
              <Button size="sm" variant="destructive" onClick={bulkRejectReviews}><Trash2 className="mr-1 h-3.5 w-3.5" /> Từ chối & xóa</Button>
            </BulkActionBar>
            {pendingReviews.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Không có review nào chờ duyệt 🎉</p>
            ) : (
              <>
                <div className="flex items-center gap-2 px-1">
                  <SelectAllCheckbox items={pendingReviews} selected={selectedReviews} setSelected={setSelectedReviews} />
                  <span className="text-sm text-muted-foreground">Chọn tất cả</span>
                </div>
                {pendingReviews.map((r: any) => (
                  <Card key={r.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={selectedReviews.has(r.id)} onCheckedChange={() => toggle(selectedReviews, r.id, setSelectedReviews)} />
                          <div>
                            <CardTitle className="text-lg">{r.title}</CardTitle>
                            <CardDescription>Tool: {r.tools?.name} | Bởi: {r.profiles?.display_name}</CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveReview.mutate(r.id)}><Check className="mr-1 h-4 w-4" /> Duyệt</Button>
                          <Button size="sm" variant="outline" onClick={() => { if (confirm("Xóa review?")) { supabase.from("reviews").delete().eq("id", r.id).then(() => { queryClient.invalidateQueries({ queryKey: ["mod-pending-reviews"] }); toast.success("Đã xóa"); }); } }}>
                            <X className="mr-1 h-4 w-4" /> Xóa
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm">{r.content?.slice(0, 200)}...</CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          {/* Comments tab */}
          <TabsContent value="comments" className="space-y-4 mt-4">
            <BulkActionBar count={selectedComments.size} total={recentComments.length} onClear={() => setSelectedComments(new Set())}>
              <Button size="sm" variant="destructive" onClick={bulkDeleteComments}><Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa tất cả</Button>
            </BulkActionBar>
            {recentComments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Chưa có comment nào</p>
            ) : (
              <>
                <div className="flex items-center gap-2 px-1">
                  <SelectAllCheckbox items={recentComments} selected={selectedComments} setSelected={setSelectedComments} />
                  <span className="text-sm text-muted-foreground">Chọn tất cả</span>
                </div>
                {recentComments.map((c: any) => {
                  const isFlagged = blacklist.some((kw: string) => c.content?.toLowerCase().includes(kw.toLowerCase()));
                  return (
                    <Card key={c.id} className={isFlagged ? "border-orange-500/50" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={selectedComments.has(c.id)} onCheckedChange={() => toggle(selectedComments, c.id, setSelectedComments)} />
                          <div className="flex-1 flex items-center justify-between">
                            <CardDescription>
                              {c.profiles?.display_name ?? "Ẩn danh"} trên {c.tools?.name ?? "—"} — {new Date(c.created_at).toLocaleDateString("vi-VN")}
                              {isFlagged && <Badge variant="outline" className="ml-2 border-orange-500 text-orange-600 text-[10px]">⚠️ Flagged</Badge>}
                            </CardDescription>
                            <div className="flex gap-1">
                              {isFlagged && c.user_id && (
                                <Button size="sm" variant="ghost" onClick={() => quickBanUser(c.user_id)} title="Ban user">
                                  <Ban className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Xóa comment?")) deleteComment.mutate(c.id); }}>
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm pl-10">{c.content}</CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* Questions tab */}
          <TabsContent value="questions" className="space-y-4 mt-4">
            <BulkActionBar count={selectedQuestions.size} total={pendingQuestions.length} onClear={() => setSelectedQuestions(new Set())}>
              <Button size="sm" variant="destructive" onClick={bulkDeleteQuestions}><Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa tất cả</Button>
            </BulkActionBar>
            {pendingQuestions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Chưa có câu hỏi nào</p>
            ) : (
              <>
                <div className="flex items-center gap-2 px-1">
                  <SelectAllCheckbox items={pendingQuestions} selected={selectedQuestions} setSelected={setSelectedQuestions} />
                  <span className="text-sm text-muted-foreground">Chọn tất cả</span>
                </div>
                {pendingQuestions.map((q: any) => (
                  <Card key={q.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={selectedQuestions.has(q.id)} onCheckedChange={() => toggle(selectedQuestions, q.id, setSelectedQuestions)} />
                          <div>
                            <CardTitle className="text-base">{q.title}</CardTitle>
                            <CardDescription>{q.profiles?.display_name ?? "Ẩn danh"} — {q.tools?.name ?? "—"} — {new Date(q.created_at).toLocaleDateString("vi-VN")}</CardDescription>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Xóa câu hỏi?")) supabase.from("questions").delete().eq("id", q.id).then(() => { queryClient.invalidateQueries({ queryKey: ["mod-pending-questions"] }); toast.success("Đã xóa"); }); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    {q.content && <CardContent className="text-sm text-muted-foreground">{q.content.slice(0, 200)}</CardContent>}
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          {/* Launch comments tab */}
          <TabsContent value="launch-comments" className="space-y-4 mt-4">
            <BulkActionBar count={selectedLaunchComments.size} total={recentLaunchComments.length} onClear={() => setSelectedLaunchComments(new Set())}>
              <Button size="sm" variant="destructive" onClick={bulkDeleteLaunchComments}><Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa tất cả</Button>
            </BulkActionBar>
            {recentLaunchComments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Chưa có comment launch nào</p>
            ) : (
              <>
                <div className="flex items-center gap-2 px-1">
                  <SelectAllCheckbox items={recentLaunchComments} selected={selectedLaunchComments} setSelected={setSelectedLaunchComments} />
                  <span className="text-sm text-muted-foreground">Chọn tất cả</span>
                </div>
                {recentLaunchComments.map((c: any) => (
                  <Card key={c.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={selectedLaunchComments.has(c.id)} onCheckedChange={() => toggle(selectedLaunchComments, c.id, setSelectedLaunchComments)} />
                          <CardDescription>
                            Launch: {c.launches?.product_name || c.launches?.tagline || "—"} — {new Date(c.created_at).toLocaleDateString("vi-VN")}
                          </CardDescription>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Xóa comment?")) deleteLaunchComment.mutate(c.id); }}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm">{c.content}</CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          {/* Flagged tab */}
          <TabsContent value="flagged" className="space-y-4 mt-4">
            <BulkActionBar count={selectedFlagged.size} total={flaggedComments.length} onClear={() => setSelectedFlagged(new Set())}>
              <Button size="sm" variant="destructive" onClick={bulkDeleteFlagged}><Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa tất cả</Button>
              <Button size="sm" variant="outline" className="border-destructive text-destructive" onClick={bulkBanFlaggedUsers}><Ban className="mr-1 h-3.5 w-3.5" /> Ban users</Button>
            </BulkActionBar>
            {flaggedComments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Không có comment nào bị flag 🎉</p>
            ) : (
              <>
                <div className="flex items-center gap-2 px-1">
                  <SelectAllCheckbox items={flaggedComments} selected={selectedFlagged} setSelected={setSelectedFlagged} />
                  <span className="text-sm text-muted-foreground">Chọn tất cả</span>
                </div>
                {flaggedComments.map((c: any) => (
                  <Card key={c.id} className="border-orange-500/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={selectedFlagged.has(c.id)} onCheckedChange={() => toggle(selectedFlagged, c.id, setSelectedFlagged)} />
                          <CardDescription>
                            <AlertTriangle className="inline h-3 w-3 mr-1 text-orange-500" />
                            {c.profiles?.display_name ?? "Ẩn danh"} trên {c.tools?.name ?? "—"} — {new Date(c.created_at).toLocaleDateString("vi-VN")}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1">
                          {c.user_id && (
                            <Button size="sm" variant="ghost" onClick={() => quickBanUser(c.user_id)} title="Ban user">
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Xóa comment?")) deleteComment.mutate(c.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm">{c.content}</CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Blacklist Dialog */}
      <Dialog open={showBlacklistDialog} onOpenChange={setShowBlacklistDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Keyword Blacklist</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Comments chứa các từ khóa này sẽ tự động bị đánh dấu (flagged) để admin review.</p>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="Thêm từ khóa..." onKeyDown={(e) => e.key === "Enter" && addKeyword()} />
              <Button onClick={addKeyword} disabled={!newKeyword.trim()}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-60 overflow-auto">
              {blacklist.map((kw: string) => (
                <div key={kw} className="flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 dark:bg-orange-950/20 px-3 py-1 text-sm">
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="ml-1 text-destructive hover:text-destructive/80">×</button>
                </div>
              ))}
              {blacklist.length === 0 && <p className="text-sm text-muted-foreground">Chưa có keyword nào</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
