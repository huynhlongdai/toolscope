import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi as viLocale } from "date-fns/locale";

interface LaunchCommentsProps {
  launchId: string;
}

export function LaunchComments({ launchId }: LaunchCommentsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: comments = [] } = useQuery({
    queryKey: ["launch-comments", launchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("launch_comments")
        .select("*, profiles:user_id(display_name, avatar_url)")
        .eq("launch_id", launchId)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`launch-comments-${launchId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "launch_comments", filter: `launch_id=eq.${launchId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["launch-comments", launchId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [launchId, queryClient]);

  const handleSubmit = async () => {
    if (!user) { toast.error("Vui lòng đăng nhập để bình luận"); return; }
    if (!content.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("launch_comments").insert({
      launch_id: launchId,
      user_id: user.id,
      content: content.trim(),
    });
    if (error) toast.error("Lỗi gửi bình luận");
    else { setContent(""); }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    await supabase.from("launch_comments").delete().eq("id", commentId);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <MessageSquare className="h-4 w-4" /> Bình luận ({comments.length})
      </h3>

      {user && (
        <div className="flex gap-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Viết bình luận..."
            rows={2}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSubmit())}
          />
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !content.trim()} className="self-end">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {comments.map((c: any) => {
          const profile = c.profiles as any;
          return (
            <div key={c.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>{(profile?.display_name || "U")[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{profile?.display_name || "User"}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: viLocale })}
                  </span>
                  {user?.id === c.user_id && (
                    <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          );
        })}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
        )}
      </div>
    </div>
  );
}
