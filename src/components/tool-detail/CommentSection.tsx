import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { VoteButtons } from "./VoteButtons";
import { MessageCircle, Reply, Flag } from "lucide-react";
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
    queryKey: ["tool-comments", toolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*, profiles:user_id(display_name, avatar_url)")
        .eq("tool_id", toolId)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(20);
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
  };

  return (
    <Card>
      <CardHeader><CardTitle>Bình luận ({comments?.length || 0})</CardTitle></CardHeader>
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
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{c.content}</p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <VoteButtons targetId={c.id} targetType="comment" upvotes={c.upvotes} downvotes={c.downvotes} userId={userId} />
                        <button
                          onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Reply className="h-3 w-3" /> Trả lời
                        </button>
                        {userId && (
                          <button onClick={() => setReportTarget(c.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                            <Flag className="h-3 w-3" /> Báo cáo
                          </button>
                        )}
                      </div>

                      {/* Reply form */}
                      {replyTo === c.id && (
                        <div className="mt-2 flex gap-2">
                          <Textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            placeholder="Trả lời..."
                            className="min-h-[50px] text-sm"
                            maxLength={2000}
                          />
                          <div className="flex flex-col gap-1">
                            <Button size="sm" className="h-7 text-xs" onClick={() => submitComment(c.id)}>Gửi</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setReplyTo(null)}>Hủy</Button>
                          </div>
                        </div>
                      )}

                      {/* Replies */}
                      {commentReplies.length > 0 && (
                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-border">
                          {commentReplies.map(r => (
                            <div key={r.id} className="flex gap-2">
                              <div className="h-6 w-6 shrink-0 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                                {(r.profiles as any)?.display_name?.charAt(0) || "?"}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium">{(r.profiles as any)?.display_name || "Ẩn danh"}</span>
                                  <span className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("vi-VN")}</span>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">{r.content}</p>
                                <div className="mt-1">
                                  <VoteButtons targetId={r.id} targetType="comment" upvotes={r.upvotes} downvotes={r.downvotes} userId={userId} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
