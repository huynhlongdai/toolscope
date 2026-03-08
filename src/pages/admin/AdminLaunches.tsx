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
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Star, Rocket, Eye, ExternalLink, Search, CheckCheck, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { logAuditAction } from "@/hooks/useAuditLog";

export default function AdminLaunches() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailLaunch, setDetailLaunch] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const filtered = useMemo(() => {
    if (!search.trim()) return launches;
    const s = search.toLowerCase();
    return launches.filter((l: any) => {
      const name = (l.tools as any)?.name || (l as any).product_name || l.tagline || "";
      return name.toLowerCase().includes(s) || l.tagline?.toLowerCase().includes(s);
    });
  }, [launches, search]);

  // Stats
  const stats = useMemo(() => {
    const total = launches.length;
    const approved = launches.filter((l: any) => l.status === "approved" || l.status === "featured").length;
    const pending = launches.filter((l: any) => l.status === "pending").length;
    const avgUpvotes = total > 0 ? Math.round(launches.reduce((s: number, l: any) => s + (l.upvotes || 0), 0) / total) : 0;
    return { total, approved, pending, avgUpvotes };
  }, [launches]);

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
    for (const id of ids) {
      await supabase.from("launches").update({ status: action }).eq("id", id);
    }
    logAuditAction(`launch_bulk_${action}`, "launch", undefined, { count: ids.length });
    queryClient.invalidateQueries({ queryKey: ["admin-launches"] });
    setSelected(new Set());
    toast.success(`Đã ${action === "approved" ? "duyệt" : "từ chối"} ${ids.length} launches`);
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

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Rocket className="h-5 w-5 md:h-6 md:w-6" /> Quản lý Launches</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">Duyệt, từ chối hoặc feature các sản phẩm submit</p>
          </div>
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

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Đã duyệt</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.approved}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Chờ duyệt</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.pending}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Avg Upvotes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.avgUpvotes}</div></CardContent></Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm product name, tagline..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <Card>
            <CardContent className="py-3 flex items-center gap-3">
              <span className="text-sm font-medium">{selected.size} đã chọn</span>
              <Button size="sm" variant="outline" onClick={() => bulkAction("approved")}><CheckCheck className="mr-1 h-3.5 w-3.5" /> Duyệt tất cả</Button>
              <Button size="sm" variant="destructive" onClick={() => bulkAction("rejected")}><X className="mr-1 h-3.5 w-3.5" /> Từ chối tất cả</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Bỏ chọn</Button>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Maker</TableHead>
                  <TableHead>Ngày launch</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Upvotes</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((launch: any) => {
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
                            <p className="font-medium">{name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{launch.tagline}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{profile?.display_name || "—"}</TableCell>
                      <TableCell className="text-sm">{format(new Date(launch.launch_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{launch.pricing_type && <Badge variant="outline" className="text-[10px]">{launch.pricing_type}</Badge>}</TableCell>
                      <TableCell className="text-sm font-medium">{launch.upvotes || 0}</TableCell>
                      <TableCell>{statusBadge(launch.status)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailLaunch(launch)}><Eye className="h-3.5 w-3.5" /></Button>
                          {launch.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "approved")}><Check className="h-3 w-3" /> Duyệt</Button>
                              <Button size="sm" variant="destructive" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "rejected")}><X className="h-3 w-3" /> Từ chối</Button>
                            </>
                          )}
                          {launch.status === "approved" && (
                            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "featured")}><Star className="h-3 w-3" /> Feature</Button>
                          )}
                          {launch.status === "featured" && (
                            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "approved")}>Bỏ Feature</Button>
                          )}
                          {launch.status === "rejected" && (
                            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "approved")}><Check className="h-3 w-3" /> Duyệt lại</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Không có launch nào</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
              {detailLaunch.website_url && (
                <p><span className="font-medium">Website:</span> <a href={detailLaunch.website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">{detailLaunch.website_url} <ExternalLink className="h-3 w-3" /></a></p>
              )}
              {detailLaunch.description && <p><span className="font-medium">Mô tả:</span> {detailLaunch.description}</p>}
              {detailLaunch.pricing_type && <p><span className="font-medium">Pricing:</span> <Badge variant="outline">{detailLaunch.pricing_type}</Badge></p>}
              {detailLaunch.features?.length > 0 && (
                <div>
                  <span className="font-medium">Tính năng:</span>
                  <div className="flex flex-wrap gap-1 mt-1">{detailLaunch.features.map((f: string, i: number) => <Badge key={i} variant="secondary">{f}</Badge>)}</div>
                </div>
              )}
              {detailLaunch.screenshots?.length > 0 && (
                <div>
                  <span className="font-medium">Screenshots:</span>
                  <div className="flex gap-2 mt-1 overflow-x-auto">
                    {detailLaunch.screenshots.map((url: string, i: number) => (
                      <img key={i} src={url} alt="" className="h-20 rounded border object-cover" />
                    ))}
                  </div>
                </div>
              )}
              {detailLaunch.video_url && <p><span className="font-medium">Video:</span> <a href={detailLaunch.video_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{detailLaunch.video_url}</a></p>}
              {detailLaunch.maker_comment && (
                <div className="border-l-2 border-primary/30 pl-3 italic text-muted-foreground">"{detailLaunch.maker_comment}"</div>
              )}
              <p className="text-xs text-muted-foreground">Trạng thái: {statusBadge(detailLaunch.status)} • Upvotes: {detailLaunch.upvotes || 0}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
