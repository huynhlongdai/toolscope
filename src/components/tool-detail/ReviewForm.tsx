import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PenLine, Sparkles, Loader2 } from "lucide-react";

interface ReviewFormProps {
  toolId: string;
  userId?: string;
}

export function ReviewForm({ toolId, userId }: ReviewFormProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateDraft = async () => {
    if (!userId) { toast.error("Vui lòng đăng nhập"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-review", {
        body: { tool_id: toolId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTitle(data.title || "");
      setContent(data.content || "");
      toast.success("Đã tạo bản nháp AI!", { description: "Bạn có thể chỉnh sửa trước khi gửi." });
    } catch (e: any) {
      toast.error("Lỗi tạo AI draft", { description: e.message });
    } finally {
      setGenerating(false);
    }
  };

  const submit = async () => {
    if (!userId) { toast.error("Vui lòng đăng nhập"); return; }
    if (!title.trim() || !content.trim()) { toast.error("Vui lòng điền đầy đủ"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      tool_id: toolId, author_id: userId, title: title.trim(), content: content.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error("Lỗi", { description: error.message }); return; }
    setTitle(""); setContent(""); setOpen(false);
    toast.success("Đã gửi review!");
    queryClient.invalidateQueries({ queryKey: ["tool-reviews", toolId] });
  };

  if (!open) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={!userId}>
          <PenLine className="h-4 w-4 mr-1.5" /> Viết review
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Viết review</CardTitle>
          <Button variant="secondary" size="sm" onClick={generateDraft} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            {generating ? "Đang tạo..." : "AI Draft"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Tiêu đề review"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
        <Textarea
          placeholder="Chia sẻ trải nghiệm của bạn... (hỗ trợ Markdown)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
          maxLength={10000}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? "Đang gửi..." : "Gửi review"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
        </div>
      </CardContent>
    </Card>
  );
}
