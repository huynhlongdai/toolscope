import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, X, Wrench, MessageSquare, HelpCircle } from "lucide-react";

export default function AdminModeration() {
  const queryClient = useQueryClient();

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
      const { data } = await supabase.from("comments").select("*, profiles!comments_user_id_fkey(display_name), tools!comments_tool_id_fkey(name)").order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const approveTool = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tools").update({ status: "published" as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-pending-tools"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Đã duyệt tool");
    },
  });

  const rejectTool = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tools").update({ status: "archived" as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-pending-tools"] });
      toast.success("Đã từ chối tool");
    },
  });

  const approveReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").update({ status: "published" as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-pending-reviews"] });
      toast.success("Đã duyệt review");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mod-recent-comments"] });
      toast.success("Đã xóa comment");
    },
  });

  const totalPending = pendingTools.length + pendingReviews.length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Moderation Queue</h1>
          {totalPending > 0 && <Badge variant="destructive">{totalPending} chờ duyệt</Badge>}
        </div>

        <Tabs defaultValue="tools">
          <TabsList>
            <TabsTrigger value="tools">
              <Wrench className="mr-1 h-4 w-4" /> Tools ({pendingTools.length})
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <MessageSquare className="mr-1 h-4 w-4" /> Reviews ({pendingReviews.length})
            </TabsTrigger>
            <TabsTrigger value="comments">
              <HelpCircle className="mr-1 h-4 w-4" /> Comments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="space-y-4 mt-4">
            {pendingTools.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Không có tool nào chờ duyệt 🎉</p>
            ) : (
              pendingTools.map((tool: any) => (
                <Card key={tool.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{tool.name}</CardTitle>
                        <CardDescription>{tool.short_description ?? tool.description?.slice(0, 100)}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveTool.mutate(tool.id)}>
                          <Check className="mr-1 h-4 w-4" /> Duyệt
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectTool.mutate(tool.id)}>
                          <X className="mr-1 h-4 w-4" /> Từ chối
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>Website: {tool.website_url ?? "—"} | Pricing: {tool.pricing_type}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4 mt-4">
            {pendingReviews.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Không có review nào chờ duyệt 🎉</p>
            ) : (
              pendingReviews.map((r: any) => (
                <Card key={r.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{r.title}</CardTitle>
                        <CardDescription>
                          Tool: {r.tools?.name} | Bởi: {r.profiles?.display_name}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveReview.mutate(r.id)}>
                          <Check className="mr-1 h-4 w-4" /> Duyệt
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => {
                          if (confirm("Xóa review này?")) {
                            supabase.from("reviews").delete().eq("id", r.id).then(() => {
                              queryClient.invalidateQueries({ queryKey: ["mod-pending-reviews"] });
                              toast.success("Đã xóa");
                            });
                          }
                        }}>
                          <X className="mr-1 h-4 w-4" /> Xóa
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">{r.content?.slice(0, 200)}...</CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="comments" className="space-y-4 mt-4">
            {recentComments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Chưa có comment nào</p>
            ) : (
              recentComments.map((c: any) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardDescription>
                        {c.profiles?.display_name ?? "Ẩn danh"} trên {c.tools?.name ?? "—"} — {new Date(c.created_at).toLocaleDateString("vi-VN")}
                      </CardDescription>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Xóa comment?")) deleteComment.mutate(c.id); }}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">{c.content}</CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
