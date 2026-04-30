import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PenLine, Sparkles, Loader2, Star } from "lucide-react";

interface Props {
  toolId: string;
  userId?: string;
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-sm whitespace-nowrap">{label}</Label>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(s)}
            className="p-0.5"
          >
            <Star className={`h-5 w-5 transition-colors ${
              s <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function StructuredReviewForm({ toolId, userId }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [easeOfUse, setEaseOfUse] = useState(0);
  const [customerSupport, setCustomerSupport] = useState(0);
  const [valueForMoney, setValueForMoney] = useState(0);
  const [nps, setNps] = useState(0);
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [useCase, setUseCase] = useState("");

  const generateDraft = async () => {
    if (!userId) { toast.error("Vui lòng đăng nhập"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-review", { body: { tool_id: toolId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setTitle(data.title || "");
      setContent(data.content || "");
      toast.success("Đã tạo bản nháp AI!");
    } catch (e: any) {
      toast.error("Lỗi tạo AI draft", { description: e.message });
    } finally {
      setGenerating(false);
    }
  };

  const submit = async () => {
    if (!userId) { toast.error("Vui lòng đăng nhập"); return; }
    if (!title.trim() || !content.trim()) { toast.error("Vui lòng điền tiêu đề và nội dung"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      tool_id: toolId,
      author_id: userId,
      title: title.trim(),
      content: content.trim(),
      ease_of_use: easeOfUse || null,
      customer_support: customerSupport || null,
      value_for_money: valueForMoney || null,
      likelihood_to_recommend: nps || null,
      pros: pros.trim() || null,
      cons: cons.trim() || null,
      use_case: useCase.trim() || null,
    } as any);
    setSubmitting(false);
    if (error) { toast.error("Lỗi", { description: error.message }); return; }
    setTitle(""); setContent(""); setPros(""); setCons(""); setUseCase("");
    setEaseOfUse(0); setCustomerSupport(0); setValueForMoney(0); setNps(0);
    setOpen(false);
    toast.success("Đã gửi review!");
    queryClient.invalidateQueries({ queryKey: ["tool-reviews", toolId] });
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={!userId}>
        <PenLine className="h-4 w-4 mr-1.5" /> Viết review
      </Button>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Viết review có cấu trúc</CardTitle>
          <Button variant="secondary" size="sm" onClick={generateDraft} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            AI Draft
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Criteria Ratings */}
        <div className="grid gap-3 sm:grid-cols-2 p-3 rounded-lg bg-muted/50">
          <StarRating label="Dễ sử dụng" value={easeOfUse} onChange={setEaseOfUse} />
          <StarRating label="Hỗ trợ KH" value={customerSupport} onChange={setCustomerSupport} />
          <StarRating label="Giá trị" value={valueForMoney} onChange={setValueForMoney} />
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm whitespace-nowrap">Khả năng giới thiệu (NPS)</Label>
            <div className="flex gap-0.5">
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNps(n)}
                  className={`h-6 w-6 rounded text-xs font-medium transition-colors ${
                    n <= nps
                      ? n <= 6 ? "bg-red-500 text-white" : n <= 8 ? "bg-amber-500 text-white" : "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Input placeholder="Tiêu đề review" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-green-600 dark:text-green-400">👍 Điểm mạnh</Label>
            <Textarea placeholder="Bạn thích gì nhất?" value={pros} onChange={(e) => setPros(e.target.value)} className="mt-1 min-h-[80px] text-sm" />
          </div>
          <div>
            <Label className="text-xs text-red-600 dark:text-red-400">👎 Điểm yếu</Label>
            <Textarea placeholder="Bạn không thích gì?" value={cons} onChange={(e) => setCons(e.target.value)} className="mt-1 min-h-[80px] text-sm" />
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">💼 Bạn dùng tool này cho việc gì?</Label>
          <Input placeholder="VD: Quản lý dự án, Thiết kế đồ họa..." value={useCase} onChange={(e) => setUseCase(e.target.value)} className="mt-1" />
        </div>

        <Textarea
          placeholder="Chia sẻ trải nghiệm chi tiết... (hỗ trợ Markdown)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[150px] font-mono text-sm"
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
