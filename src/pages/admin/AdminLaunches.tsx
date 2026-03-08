import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Star, Rocket, Eye, ExternalLink, Search, CheckCheck, TrendingUp, Bell, Clock, MessageSquare, Trash2, Send, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { logAuditAction } from "@/hooks/useAuditLog";
import { AdminCreateLaunchDialog } from "@/components/admin/AdminCreateLaunchDialog";

export default function AdminLaunches() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailLaunch, setDetailLaunch] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [commentsLaunchId, setCommentsLaunchId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editLaunch, setEditLaunch] = useState<any>(null);
  const { data: launches = [], isLoading } = useQuery({
    queryKey: ["admin-launches", filter],
    queryFn: async () => {
      let q = supabase.from("launches").select("*, profiles:maker_id(display_name, avatar_url), tools(name, slug)").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const comingSoonLaunches = useMemo(() => launches.filter((l: any) => l.is_coming_soon || (l.scheduled_at && new Date(l.scheduled_at) > new Date())), [launches]);

  const { data: comments = [] } = useQuery({
    queryKey: ["admin-launch-comments", commentsLaunchId],
    queryFn: async () => {
      const { data } = await supabase.from("launch_comments").select("*, profiles:user_id(display_name)").eq("launch_id", commentsLaunchId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!commentsLaunchId,
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return launches;
    const s = search.toLowerCase();
    return launches.filter((l: any) => {
      const name = (l.tools as any)?.name || l.product_name || l.tagline || "";
      return name.toLowerCase().includes(s) || l.tagline?.toLowerCase().includes(s);
    });
  }, [launches, search]);

  const stats = useMemo(() => {
    const total = launches.length;
    const approved = launches.filter((l: any) => l.status === "approved" || l.status === "featured").length;
    const pending = launches.filter((l: any) => l.status === "pending").length;
    const coming = comingSoonLaunches.length;
    const totalSubs = launches.reduce((s: number, l: any) => s + (l.subscriber_count || 0), 0);
    return { total, approved, pending, coming, totalSubs };
  }, [launches, comingSoonLaunches]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("launches").update({ status }).eq("id", id);
    if (error) { toast.error("Lỗi cập nhật"); return; }
    logAuditAction("launch_status_change", "launch", id, { status });
    toast.success(`Đã chuyển thành ${status}`);
    queryClient.invalidateQueries({ queryKey: ["admin-launches"] });
  };

  const bulkAction = async (action: "approved" | "rejected") => {
    const ids = Array.from(selected);
    if (!ids.length || !confirm(`${action === "approved" ? "Duyệt" : "Từ chối"} ${ids.length} launches?`)) return;
    for (const id of ids) await supabase.from("launches").update({ status: action }).eq("id", id);
    logAuditAction(`launch_bulk_${action}`, "launch", undefined, { count: ids.length });
    queryClient.invalidateQueries({ queryKey: ["admin-launches"] });
    setSelected(new Set());
    toast.success(`Đã ${action === "approved" ? "duyệt" : "từ chối"} ${ids.length} launches`);
  };

  const notifySubscribers = async (launchId: string, launchName: string) => {
    if (!confirm(`Gửi thông báo cho tất cả subscribers của "${launchName}"?`)) return;
    const { data: subs } = await supabase.from("launch_subscribers").select("user_id").eq("launch_id", launchId).is("notified_at", null);
    if (!subs?.length) { toast.info("Không có subscriber nào cần thông báo"); return; }
    for (const sub of subs) {
      if (sub.user_id) {
        await supabase.from("notifications").insert({
          user_id: sub.user_id,
          type: "launch",
          title: `🚀 ${launchName} đã ra mắt!`,
          message: "Sản phẩm bạn theo dõi vừa chính thức ra mắt.",
          link: `/launch/${launchId}`,
        });
      }
    }
    await supabase.from("launch_subscribers").update({ notified_at: new Date().toISOString() }).eq("launch_id", launchId).is("notified_at", null);
    toast.success(`Đã gửi thông báo cho ${subs.length} subscribers`);
  };

  const deleteComment = async (commentId: string) => {
    await supabase.from("launch_comments").delete().eq("id", commentId);
    queryClient.invalidateQueries({ queryKey: ["admin-launch-comments"] });
    toast.success("Đã xoá bình luận");
  };

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((l: any) => l.id)));
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Chờ duyệt" },
      approved: { variant: "secondary", label: "Đã duyệt" },
      featured: { variant: "default", label: "Featured" },
      rejected: { variant: "destructive", label: "Từ chối" },
    };
    const s = map[status] || { variant: "outline" as const, label: status };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const renderTable = (items: any[]) => (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"><Checkbox checked={items.length > 0 && selected.size === items.length} onCheckedChange={toggleAll} /></TableHead>
            <TableHead>Sản phẩm</TableHead>
            <TableHead>Maker</TableHead>
            <TableHead>Ngày</TableHead>
            <TableHead>Subscribers</TableHead>
            <TableHead>Upvotes</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((launch: any) => {
            const tool = launch.tools as any;
            const profile = launch.profiles as any;
            const name = tool?.name || launch.product_name || launch.tagline;
            return (
              <TableRow key={launch.id} className={selected.has(launch.id) ? "bg-muted/50" : ""}>
                <TableCell><Checkbox checked={selected.has(launch.id)} onCheckedChange={() => toggleSelect(launch.id)} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {launch.logo_url && <img src={launch.logo_url} alt="" className="h-8 w-8 rounded object-cover" />}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium">{name}</p>
                        {launch.is_coming_soon && <Badge variant="outline" className="text-[10px] px-1 py-0"><Clock className="h-2.5 w-2.5 mr-0.5" />Soon</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{launch.tagline}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{profile?.display_name || "—"}</TableCell>
                <TableCell className="text-sm">
                  {format(new Date(launch.launch_date), "dd/MM/yyyy")}
                  {launch.scheduled_at && <p className="text-[10px] text-primary">📅 {format(new Date(launch.scheduled_at), "dd/MM HH:mm")}</p>}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-sm"><Bell className="h-3 w-3 text-muted-foreground" />{launch.subscriber_count || 0}</span>
                </TableCell>
                <TableCell className="text-sm font-medium">{launch.upvotes || 0}</TableCell>
                <TableCell>{statusBadge(launch.status)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1 flex-wrap">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailLaunch(launch)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setCommentsLaunchId(launch.id)}><MessageSquare className="h-3.5 w-3.5" /></Button>
                    {(launch.subscriber_count || 0) > 0 && (
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => notifySubscribers(launch.id, name)}>
                        <Send className="h-3 w-3" /> Notify
                      </Button>
                    )}
                    {launch.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "approved")}><Check className="h-3 w-3" /></Button>
                        <Button size="sm" variant="destructive" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "rejected")}><X className="h-3 w-3" /></Button>
                      </>
                    )}
                    {launch.status === "approved" && <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "featured")}><Star className="h-3 w-3" /></Button>}
                    {launch.status === "featured" && <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => updateStatus(launch.id, "approved")}>Unfeature</Button>}
                    {launch.status === "rejected" && <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "approved")}><Check className="h-3 w-3" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {items.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Không có launch nào</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Rocket className="h-5 w-5 md:h-6 md:w-6" /> Quản lý Launches</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Duyệt, lên lịch, thông báo subscribers</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreateDialog(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Tạo Launch
            </Button>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đã duyệt</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.approved}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.pending}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Coming Soon</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.coming}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1"><Bell className="h-3.5 w-3.5" /> Subscribers</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.totalSubs}</div></CardContent></Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm product name, tagline..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <Card><CardContent className="py-3 flex items-center gap-3">
            <span className="text-sm font-medium">{selected.size} đã chọn</span>
            <Button size="sm" variant="outline" onClick={() => bulkAction("approved")}><CheckCheck className="mr-1 h-3.5 w-3.5" /> Duyệt</Button>
            <Button size="sm" variant="destructive" onClick={() => bulkAction("rejected")}><X className="mr-1 h-3.5 w-3.5" /> Từ chối</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Bỏ chọn</Button>
          </CardContent></Card>
        )}

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">Tất cả ({filtered.length})</TabsTrigger>
              <TabsTrigger value="coming">Coming Soon ({comingSoonLaunches.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all">{renderTable(filtered)}</TabsContent>
            <TabsContent value="coming">{renderTable(comingSoonLaunches)}</TabsContent>
          </Tabs>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailLaunch} onOpenChange={(open) => !open && setDetailLaunch(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Chi tiết Launch</DialogTitle></DialogHeader>
          {detailLaunch && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                {detailLaunch.logo_url && <img src={detailLaunch.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                <div>
                  <p className="font-semibold text-base">{detailLaunch.product_name || detailLaunch.tagline}</p>
                  <p className="text-muted-foreground">{detailLaunch.tagline}</p>
                </div>
              </div>
              {detailLaunch.scheduled_at && <p><span className="font-medium">Lịch ra mắt:</span> {format(new Date(detailLaunch.scheduled_at), "dd/MM/yyyy HH:mm")}</p>}
              {detailLaunch.trial_url && <p><span className="font-medium">Trial URL:</span> <a href={detailLaunch.trial_url} target="_blank" className="text-primary hover:underline">{detailLaunch.trial_url}</a></p>}
              {detailLaunch.website_url && <p><span className="font-medium">Website:</span> <a href={detailLaunch.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">{detailLaunch.website_url} <ExternalLink className="h-3 w-3" /></a></p>}
              {detailLaunch.description && <p><span className="font-medium">Mô tả:</span> {detailLaunch.description}</p>}
              {detailLaunch.features?.length > 0 && (
                <div>
                  <span className="font-medium">Tính năng:</span>
                  <div className="flex flex-wrap gap-1 mt-1">{detailLaunch.features.map((f: string, i: number) => <Badge key={i} variant="secondary">{f}</Badge>)}</div>
                </div>
              )}
              {detailLaunch.maker_comment && <div className="border-l-2 border-primary/30 pl-3 italic text-muted-foreground">"{detailLaunch.maker_comment}"</div>}
              <p className="text-xs text-muted-foreground">
                {statusBadge(detailLaunch.status)} • Upvotes: {detailLaunch.upvotes || 0} • Subscribers: {detailLaunch.subscriber_count || 0}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Comments moderation dialog */}
      <Dialog open={!!commentsLaunchId} onOpenChange={(open) => !open && setCommentsLaunchId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Bình luận ({comments.length})</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {comments.map((c: any) => (
              <div key={c.id} className="flex items-start gap-3 group text-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{(c.profiles as any)?.display_name || "User"}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd/MM HH:mm")}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{c.content}</p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteComment(c.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Chưa có bình luận</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create launch dialog */}
      <AdminCreateLaunchDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
    </AdminLayout>
  );
}
