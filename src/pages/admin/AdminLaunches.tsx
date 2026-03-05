import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Star, Rocket, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminLaunches() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [detailLaunch, setDetailLaunch] = useState<any>(null);

  const { data: launches, isLoading } = useQuery({
    queryKey: ["admin-launches", filter],
    queryFn: async () => {
      let q = supabase
        .from("launches")
        .select("*, profiles:maker_id(display_name, avatar_url), tools(name, slug)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("launches").update({ status }).eq("id", id);
    if (error) { toast.error("Lỗi cập nhật"); return; }
    toast.success(`Đã chuyển thành ${status}`);
    queryClient.invalidateQueries({ queryKey: ["admin-launches"] });
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Rocket className="h-6 w-6" /> Quản lý Launches</h1>
            <p className="text-sm text-muted-foreground mt-1">Duyệt, từ chối hoặc feature các sản phẩm submit</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="pending">Chờ duyệt</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="rejected">Từ chối</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
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
                {launches?.map((launch) => {
                  const tool = launch.tools as any;
                  const profile = launch.profiles as any;
                  const name = tool?.name || (launch as any).product_name || launch.tagline;
                  const pricingType = (launch as any).pricing_type;
                  const websiteUrl = (launch as any).website_url;

                  return (
                    <TableRow key={launch.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(launch as any).logo_url && (
                            <img src={(launch as any).logo_url} alt="" className="h-8 w-8 rounded object-cover" />
                          )}
                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{launch.tagline}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{profile?.display_name || "—"}</TableCell>
                      <TableCell className="text-sm">{format(new Date(launch.launch_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        {pricingType && <Badge variant="outline" className="text-[10px]">{pricingType}</Badge>}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{launch.upvotes || 0}</TableCell>
                      <TableCell>{statusBadge(launch.status)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailLaunch(launch)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {launch.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "approved")}>
                                <Check className="h-3 w-3" /> Duyệt
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "rejected")}>
                                <X className="h-3 w-3" /> Từ chối
                              </Button>
                            </>
                          )}
                          {launch.status === "approved" && (
                            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "featured")}>
                              <Star className="h-3 w-3" /> Feature
                            </Button>
                          )}
                          {launch.status === "featured" && (
                            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "approved")}>Bỏ Feature</Button>
                          )}
                          {launch.status === "rejected" && (
                            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => updateStatus(launch.id, "approved")}>
                              <Check className="h-3 w-3" /> Duyệt lại
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {launches?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có launch nào</TableCell>
                  </TableRow>
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
                {(detailLaunch as any).logo_url && <img src={(detailLaunch as any).logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                <div>
                  <p className="font-semibold text-base">{(detailLaunch as any).product_name || detailLaunch.tagline}</p>
                  <p className="text-muted-foreground">{detailLaunch.tagline}</p>
                </div>
              </div>
              {(detailLaunch as any).website_url && (
                <p><span className="font-medium">Website:</span> <a href={(detailLaunch as any).website_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">{(detailLaunch as any).website_url} <ExternalLink className="h-3 w-3" /></a></p>
              )}
              {detailLaunch.description && <p><span className="font-medium">Mô tả:</span> {detailLaunch.description}</p>}
              {(detailLaunch as any).pricing_type && <p><span className="font-medium">Pricing:</span> <Badge variant="outline">{(detailLaunch as any).pricing_type}</Badge></p>}
              {(detailLaunch as any).features?.length > 0 && (
                <div>
                  <span className="font-medium">Tính năng:</span>
                  <div className="flex flex-wrap gap-1 mt-1">{(detailLaunch as any).features.map((f: string, i: number) => <Badge key={i} variant="secondary">{f}</Badge>)}</div>
                </div>
              )}
              {(detailLaunch as any).video_url && <p><span className="font-medium">Video:</span> <a href={(detailLaunch as any).video_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{(detailLaunch as any).video_url}</a></p>}
              {(detailLaunch as any).maker_comment && (
                <div className="border-l-2 border-primary/30 pl-3 italic text-muted-foreground">"{(detailLaunch as any).maker_comment}"</div>
              )}
              <p className="text-xs text-muted-foreground">Trạng thái: {statusBadge(detailLaunch.status)} • Upvotes: {detailLaunch.upvotes || 0}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
