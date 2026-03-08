import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";

export function TaskSuggestDialog() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) { toast.error("Bạn cần đăng nhập"); return; }
    if (!name.trim()) { toast.error("Vui lòng nhập tên task"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("task_suggestions" as any).insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
      } as any);
      if (error) throw error;
      toast.success("Đã gửi đề xuất! Admin sẽ xem xét.");
      setName("");
      setDescription("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Lightbulb className="h-4 w-4" />
          {t("tasks.suggest") || "Đề xuất task"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tasks.suggestTitle") || "Đề xuất task mới"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Tên task *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Tạo video từ text"
              maxLength={100}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mô tả (tùy chọn)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về task này..."
              rows={3}
              maxLength={500}
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()} className="w-full">
            {submitting ? "Đang gửi..." : "Gửi đề xuất"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
