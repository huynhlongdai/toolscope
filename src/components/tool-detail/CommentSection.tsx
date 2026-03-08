import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { VoteButtons } from "./VoteButtons";
import { MessageCircle, Reply, Flag, Pencil, Trash2, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface CommentSectionProps {
  toolId: string;
  userId?: string;
}

export function CommentSection({ toolId, userId }: CommentSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "votes">("newest");
  const [limit, setLimit] = useState(20);

  const submitReport = async () => {
    if (!userId || !reportTarget) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId, target_type: "comment", target_id: reportTarget,
      reason: reportReason, details: reportDetails || null,
    });
    if (error) { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Đã gửi báo cáo" });
    setReportTarget(null); setReportDetails("");
  };

  const { data: comments } = useQuery({
    queryKey: ["tool-comments", toolId, sortBy, limit],
    queryFn: async () => {
      let q = supabase
        .from("comments")
        .select("*, profiles:user_id(display_name, avatar_url)")
        .eq("tool_id", toolId)
        .is("parent_id", null);
      
      if (sortBy === "newest") q = q.order("created_at", { ascending: false });
      else if (sortBy === "oldest") q = q.order("created_at", { ascending: true });
      else q = q.order("upvotes", { ascending: false });
      
      const { data, error } = await q.limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!toolId,
  });

  const { data: replies } = useQuery({
    queryKey: ["tool-comment-replies", toolId],
    queryFn: async () => {
      if (!comments?.length) return [];
      const parentIds = comments.map(c => c.id);
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles:user_id(display_name, avatar_url)")
        .in("parent_id", parentIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!comments?.length,
  });

  const { data: totalCount } = useQuery({
    queryKey: ["tool-comments-count", toolId],
    queryFn: async () => {
      const { count } = await supabase.from("comments").select("id", { count: "exact", head: true }).eq("tool_id", toolId).is("parent_id", null);
      return count || 0;
    },
    enabled: !!toolId,
  });

  const submitComment = async (parentId?: string) => {
    if (!userId) { toast({ title: "Vui lòng đăng nhập", variant: "destructive" }); return; }
    const text = parentId ? replyText.trim() : commentText.trim();
    if (!text) return;
    const { error } = await supabase.from("comments").insert({
      tool_id: toolId, user_id: userId, content: text, parent_id: parentId || null,
    });
    if (error) { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); return; }
    if (parentId) { setReplyText(""); setReplyTo(null); }
    else { setCommentText(""); }
    toast({ title: "Đã gửi bình luận!" });
    queryClient.invalidateQueries({ queryKey: ["tool-comments", toolId] });
    queryClient.invalidateQueries({ queryKey: ["tool-comment-replies", toolId] });
    queryClient.invalidateQueries({ queryKey: ["tool-comments-count", toolId] });
  };

  const updateComment = async (commentId: string) => {
    if (!editText.trim()) return;
    const { error } = await supabase.from("comments").update({ content: editText.trim() }).eq("id", commentId);
    if (error) { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Đã cập nhật!" });
    setEditingComment(null); setEditText("");
    queryClient.invalidateQueries({ queryKey: ["tool-comments", toolId] });
    queryClient.invalidateQueries({ queryKey: ["tool-comment-replies", toolId] });
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm("Xóa bình luận này?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Đã xóa!" });
    queryClient.invalidateQueries({ queryKey: ["tool-comments", toolId] });
    queryClient.invalidateQueries({ queryKey: ["tool-comment-replies", toolId] });
    queryClient.invalidateQueries({ queryKey: ["tool-comments-count", toolId] });
  };

  const startEdit = (c: any) => {
    setEditingComment(c.id);
    setEditText(c.content);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bình luận ({totalCount || comments?.length || 0})</CardTitle>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mới nhất</SelectItem>
              <SelectItem value="oldest">Cũ nhất</SelectItem>
              <SelectItem value="votes">Nhiều vote nhất</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={userId ? "Viết bình luận..." : "Đăng nhập để bình luận"}
            className="min-h-[80px]"
            disabled={!userId}
            maxLength={2000}
          />
        </div>
        {commentText.trim() && (
          <Button size="sm" onClick={() => submitComment()}>Gửi bình luận</Button>
        )}

        {comments && comments.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border">
            {comments.map((c) => {
              const commentReplies = replies?.filter(r => r.parent_id === c.id) || [];
              const isOwn = userId === c.user_id;
              const isEditing = editingComment === c.id;
              return (
                <div key={c.id}>
                  <div className="flex gap-3">
                    <div className="h-7 w-7 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {(c.profiles as any)?.display_name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{(c.profiles as any)?.display_name || "Ẩn danh"}</span>
                        <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("vi-VN")}</span>
                        {c.created_at !== c.updated_at && <span className="text-[10px] text-muted-foreground">(đã sửa)</span>}
                      </div>
                      {isEditing ? (
                        <div className="mt-1 space-y-2">
                          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[60px] text-sm" maxLength={2000} />
                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs" onClick={() => updateComment(c.id)}>Lưu</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingComment(null)}>Hủy</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-0.5 text-sm text-muted-foreground">{c.content}</p>
                      )}
                      <div className="mt-1.5 flex items-center gap-3">
                        <VoteButtons targetId={c.id} targetType="comment" upvotes={c.upvotes} downvotes={c.downvotes} userId={userId} />
                        <button
                          onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Reply className="h-3 w-3" /> Trả lời
                        </button>
                        {isOwn && !isEditing && (
                          <>
                            <button onClick={() => startEdit(c)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3 w-3" /> Sửa
                            </button>
                            <button onClick={() => deleteComment(c.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3 w-3" /> Xóa
                            </button>
                          </>
                        )}
                        {userId && !isOwn && (
                          <button onClick={() => setReportTarget(c.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                            <Flag className="h-3 w-3" /> Báo cáo
                          </button>
                        )}
                      </div>

                      {/* Reply form */}
                      {replyTo === c.id && (
                        <div className="mt-2 flex gap-2">
                          <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Trả lời..." className="min-h-[50px] text-sm" maxLength={2000} />
                          <div className="flex flex-col gap-1">
                            <Button size="sm" className="h-7 text-xs" onClick={() => submitComment(c.id)}>Gửi</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReplyTo(null)}>Hủy</Button>
                          </div>
                        </div>
                      )}

                      {/* Replies */}
                      {commentReplies.length > 0 && (
                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-border">
                          {commentReplies.map(r => {
                            const isOwnReply = userId === r.user_id;
                            const isEditingReply = editingComment === r.id;
                            return (
                              <div key={r.id} className="flex gap-2">
                                <div className="h-6 w-6 shrink-0 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                                  {(r.profiles as any)?.display_name?.charAt(0) || "?"}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">{(r.profiles as any)?.display_name || "Ẩn danh"}</span>
                                    <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("vi-VN")}</span>
                                  </div>
                                  {isEditingReply ? (
                                    <div className="mt-1 space-y-1">
                                      <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[40px] text-xs" maxLength={2000} />
                                      <div className="flex gap-1">
                                        <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => updateComment(r.id)}>Lưu</Button>
                                        <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setEditingComment(null)}>Hủy</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="mt-0.5 text-xs text-muted-foreground">{r.content}</p>
                                  )}
                                  <div className="mt-1 flex items-center gap-2">
                                    <VoteButtons targetId={r.id} targetType="comment" upvotes={r.upvotes} downvotes={r.downvotes} userId={userId} />
                                    {isOwnReply && !isEditingReply && (
                                      <>
                                        <button onClick={() => startEdit(r)} className="text-[10px] text-muted-foreground hover:text-foreground">Sửa</button>
                                        <button onClick={() => deleteComment(r.id)} className="text-[10px] text-muted-foreground hover:text-destructive">Xóa</button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load more */}
        {totalCount && totalCount > limit && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => setLimit(prev => prev + 20)}>
              <ChevronDown className="mr-1 h-3.5 w-3.5" /> Xem thêm ({totalCount - limit} còn lại)
            </Button>
          </div>
        )}
      </CardContent>

      {/* Report Dialog */}
      <Dialog open={!!reportTarget} onOpenChange={(v) => !v && setReportTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Báo cáo bình luận</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="harassment">Quấy rối</SelectItem>
                <SelectItem value="inappropriate">Nội dung không phù hợp</SelectItem>
                <SelectItem value="misinformation">Thông tin sai lệch</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Chi tiết (tùy chọn)" value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} />
            <Button size="sm" onClick={submitReport} className="w-full">Gửi báo cáo</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}