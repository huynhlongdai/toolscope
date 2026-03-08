import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Trash2, Download, ChevronLeft, ChevronRight, Search, Eye, CheckCheck, Star } from "lucide-react";
import { useState, useMemo } from "react";
import { logAuditAction } from "@/hooks/useAuditLog";

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailReview, setDetailReview] = useState<any>(null);
  const pageSize = 50;

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews", statusFilter],
    queryFn: async () => {
      let q = supabase.from("reviews").select("*, profiles!reviews_author_id_fkey(display_name), tools!reviews_tool_id_fkey(name)").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return reviews;
    const s = search.toLowerCase();
    return reviews.filter((r: any) =>
      r.title?.toLowerCase().includes(s) ||
      r.tools?.name?.toLowerCase().includes(s) ||
      r.profiles?.display_name?.toLowerCase().includes(s)
    );
  }, [reviews, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("reviews").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      logAuditAction("review_status_change", "review", vars.id, { status: vars.status });
      toast.success("Đã cập nhật");
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      logAuditAction("review_delete", "review", id);
      toast.success("Đã xóa review");
    },
  });

  const bulkAction = async (action: "approve" | "delete") => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`${action === "delete" ? "Xóa" : "Duyệt"} ${ids.length} reviews?`)) return;

    for (const id of ids) {
      if (action === "approve") {
        await supabase.from("reviews").update({ status: "published" as any }).eq("id", id);
      } else {
        await supabase.from("reviews").delete().eq("id", id);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    logAuditAction(`review_bulk_${action}`, "review", undefined, { count: ids.length });
    setSelected(new Set());
    toast.success(`Đã ${action === "delete" ? "xóa" : "duyệt"} ${ids.length} reviews`);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map((r: any) => r.id)));
  };

  const exportCSV = () => {
    const headers = ["Title", "Tool", "Author", "Status", "Upvotes", "Downvotes", "Ease of Use", "Value", "Support", "Created"];
    const rows = filtered.map((r: any) => [
      r.title, r.tools?.name ?? "", r.profiles?.display_name ?? "", r.status,
      r.upvotes, r.downvotes, r.ease_of_use ?? "", r.value_for_money ?? "", r.customer_support ?? "",
      new Date(r.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "reviews.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const RatingBar = ({ label, value }: { label: string; value: number | null }) => {
    if (!value) return null;
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-28 text-muted-foreground">{label}</span>
        <Progress value={value * 20} className="flex-1 h-2" />
        <span className="w-8 text-right font-medium">{value}/5</span>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quản lý Reviews</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_review">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm theo tiêu đề, tool, tác giả..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <Card>
            <CardContent className="py-3 flex items-center gap-3">
              <span className="text-sm font-medium">Đã chọn {selected.size} reviews</span>
              <Button size="sm" variant="outline" onClick={() => bulkAction("approve")}><CheckCheck className="mr-1 h-3.5 w-3.5" /> Duyệt tất cả</Button>
              <Button size="sm" variant="destructive" onClick={() => bulkAction("delete")}><Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa tất cả</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Bỏ chọn</Button>
            </CardContent>
          </Card>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={paged.length > 0 && selected.size === paged.length} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Tác giả</TableHead>
                <TableHead>Ratings</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Votes</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Không có review</TableCell></TableRow>
              ) : (
                paged.map((r: any) => (
                  <TableRow key={r.id} className={selected.has(r.id) ? "bg-muted/50" : ""}>
                    <TableCell>
                      <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">{r.title}</TableCell>
                    <TableCell>{r.tools?.name ?? "—"}</TableCell>
                    <TableCell>{r.profiles?.display_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        {r.ease_of_use && <span title="Ease of use">🎯{r.ease_of_use}</span>}
                        {r.value_for_money && <span title="Value">💰{r.value_for_money}</span>}
                        {r.customer_support && <span title="Support">🎧{r.customer_support}</span>}
                        {r.likelihood_to_recommend && <span title="Recommend">👍{r.likelihood_to_recommend}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v })}>
                        <SelectTrigger className="h-7 w-[130px]">
                          <Badge variant={r.status === "published" ? "default" : "secondary"} className="text-xs">{r.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="pending_review">Pending</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="text-emerald-600">+{r.upvotes}</span> / <span className="text-destructive">-{r.downvotes}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailReview(r)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa review này?")) deleteReview.mutate(r.id); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground">Trang {page + 1} / {totalPages} ({filtered.length} reviews)</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailReview} onOpenChange={(open) => !open && setDetailReview(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Chi tiết Review</DialogTitle></DialogHeader>
          {detailReview && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{detailReview.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Tool: <span className="font-medium">{detailReview.tools?.name ?? "—"}</span> • 
                  Tác giả: <span className="font-medium">{detailReview.profiles?.display_name ?? "—"}</span> • 
                  {new Date(detailReview.created_at).toLocaleDateString("vi-VN")}
                </p>
              </div>

              {/* Structured ratings */}
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <RatingBar label="Dễ sử dụng" value={detailReview.ease_of_use} />
                  <RatingBar label="Giá trị" value={detailReview.value_for_money} />
                  <RatingBar label="Hỗ trợ KH" value={detailReview.customer_support} />
                  <RatingBar label="Giới thiệu" value={detailReview.likelihood_to_recommend} />
                </CardContent>
              </Card>

              {/* Content */}
              <div className="prose prose-sm max-w-none">
                <p>{detailReview.content}</p>
              </div>

              {/* Pros / Cons */}
              {(detailReview.pros || detailReview.cons) && (
                <div className="grid grid-cols-2 gap-4">
                  {detailReview.pros && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-emerald-600">👍 Ưu điểm</span>
                      <p className="text-sm text-muted-foreground">{detailReview.pros}</p>
                    </div>
                  )}
                  {detailReview.cons && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium text-destructive">👎 Nhược điểm</span>
                      <p className="text-sm text-muted-foreground">{detailReview.cons}</p>
                    </div>
                  )}
                </div>
              )}

              {detailReview.use_case && (
                <div>
                  <span className="text-sm font-medium">Use case:</span>
                  <p className="text-sm text-muted-foreground">{detailReview.use_case}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 border-t">
                <Badge variant={detailReview.status === "published" ? "default" : "secondary"}>{detailReview.status}</Badge>
                <span className="text-sm"><span className="text-emerald-600">+{detailReview.upvotes}</span> / <span className="text-destructive">-{detailReview.downvotes}</span></span>
                {detailReview.is_editor_review && <Badge variant="outline"><Star className="h-3 w-3 mr-1" /> Editor Review</Badge>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
