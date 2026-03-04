import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

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

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("reviews").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Đã cập nhật");
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Đã xóa review");
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Reviews</h1>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_review">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Tác giả</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Votes</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : reviews.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có review</TableCell></TableRow>
              ) : (
                reviews.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{r.title}</TableCell>
                    <TableCell>{r.tools?.name ?? "—"}</TableCell>
                    <TableCell>{r.profiles?.display_name ?? "—"}</TableCell>
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
                      <span className="text-success">+{r.upvotes}</span> / <span className="text-destructive">-{r.downvotes}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa review này?")) deleteReview.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
