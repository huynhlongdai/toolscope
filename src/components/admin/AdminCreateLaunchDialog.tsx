import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Plus, Search, Link2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { logAuditAction } from "@/hooks/useAuditLog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminCreateLaunchDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [toolSearch, setToolSearch] = useState("");
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [featureInput, setFeatureInput] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date>();

  const [form, setForm] = useState({
    product_name: "",
    tagline: "",
    description: "",
    website_url: "",
    logo_url: "",
    category_id: "",
    pricing_type: "free",
    features: [] as string[],
    video_url: "",
    maker_comment: "",
    trial_url: "",
    is_coming_soon: false,
    status: "approved",
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-select"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: toolResults } = useQuery({
    queryKey: ["tool-search-admin", toolSearch],
    queryFn: async () => {
      const { data } = await supabase
        .from("tools")
        .select("id, name, slug, logo_url, website_url, short_description, pricing_type, category_id")
        .ilike("name", `%${toolSearch}%`)
        .eq("status", "published")
        .limit(5);
      return data || [];
    },
    enabled: toolSearch.length >= 2 && !selectedToolId,
  });

  const addFeature = () => {
    const f = featureInput.trim();
    if (f && !form.features.includes(f)) {
      setForm({ ...form, features: [...form.features, f] });
      setFeatureInput("");
    }
  };

  const removeFeature = (idx: number) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== idx) });
  };

  const selectTool = (tool: any) => {
    setSelectedToolId(tool.id);
    setToolSearch(tool.name);
    setForm({
      ...form,
      product_name: tool.name,
      website_url: tool.website_url || "",
      logo_url: tool.logo_url || "",
      category_id: tool.category_id || "",
      pricing_type: tool.pricing_type || "free",
    });
  };

  const clearToolLink = () => {
    setSelectedToolId(null);
    setToolSearch("");
  };

  const resetForm = () => {
    setForm({
      product_name: "", tagline: "", description: "", website_url: "", logo_url: "",
      category_id: "", pricing_type: "free", features: [], video_url: "",
      maker_comment: "", trial_url: "", is_coming_soon: false, status: "approved",
    });
    setSelectedToolId(null);
    setToolSearch("");
    setFeatureInput("");
    setScheduledDate(undefined);
  };

  const handleSubmit = async () => {
    if (!user) { toast.error("Vui lòng đăng nhập"); return; }
    if (!form.product_name.trim()) { toast.error("Vui lòng nhập tên sản phẩm"); return; }
    if (!form.tagline.trim()) { toast.error("Vui lòng nhập tagline"); return; }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("launches").insert({
        maker_id: user.id,
        tool_id: selectedToolId,
        product_name: form.product_name.trim(),
        tagline: form.tagline.trim(),
        description: form.description.trim() || null,
        website_url: form.website_url.trim() || null,
        logo_url: form.logo_url.trim() || null,
        category_id: form.category_id || null,
        pricing_type: form.pricing_type,
        features: form.features.length > 0 ? form.features : null,
        video_url: form.video_url.trim() || null,
        maker_comment: form.maker_comment.trim() || null,
        trial_url: form.trial_url.trim() || null,
        scheduled_at: scheduledDate?.toISOString() || null,
        is_coming_soon: form.is_coming_soon,
        status: form.status,
      }).select("id").single();
      if (error) throw error;

      logAuditAction("launch_created", "launch", data?.id, { product_name: form.product_name, status: form.status });
      toast.success("Đã tạo launch thành công!");
      queryClient.invalidateQueries({ queryKey: ["admin-launches"] });
      resetForm();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi tạo launch");
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo Launch mới</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pr-1">
          {/* Link existing tool */}
          <div>
            <Label className="text-sm font-medium">Liên kết tool có sẵn (tuỳ chọn)</Label>
            <div className="relative mt-1.5">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm tool đã có trong hệ thống..."
                value={toolSearch}
                onChange={(e) => { setToolSearch(e.target.value); if (selectedToolId) clearToolLink(); }}
                className="pl-9"
              />
              {selectedToolId && (
                <Button size="sm" variant="ghost" className="absolute right-1 top-1 h-7" onClick={clearToolLink}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {toolResults && toolResults.length > 0 && !selectedToolId && (
              <div className="mt-1 rounded-md border bg-popover shadow-md">
                {toolResults.map((t) => (
                  <button key={t.id} onClick={() => selectTool(t)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left">
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{t.short_description}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedToolId && <p className="text-xs text-green-600 mt-1">✓ Đã liên kết với tool có sẵn</p>}
          </div>

          {/* Status - Admin only */}
          <div>
            <Label>Trạng thái</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Basic info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Tên sản phẩm *</Label>
              <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} placeholder="VD: ChatGPT" className="mt-1.5" />
            </div>
            <div>
              <Label>Website URL</Label>
              <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://..." className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>Tagline *</Label>
            <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Mô tả ngắn gọn trong 1 câu..." className="mt-1.5" />
          </div>

          <div>
            <Label>Mô tả chi tiết</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Giới thiệu sản phẩm..." rows={4} className="mt-1.5" />
          </div>

          {/* Category & Pricing */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Danh mục</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pricing</Label>
              <Select value={form.pricing_type} onValueChange={(v) => setForm({ ...form, pricing_type: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="freemium">Freemium</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="open_source">Open Source</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule & Coming Soon */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Lịch ra mắt (tuỳ chọn)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full mt-1.5 justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "dd/MM/yyyy") : "Chọn ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end gap-3 pb-1">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_coming_soon} onCheckedChange={(v) => setForm({ ...form, is_coming_soon: v })} />
                <Label className="text-sm">Đánh dấu "Sắp ra mắt"</Label>
              </div>
            </div>
          </div>

          {/* Trial URL */}
          <div>
            <Label>Link dùng thử</Label>
            <Input value={form.trial_url} onChange={(e) => setForm({ ...form, trial_url: e.target.value })} placeholder="https://app.example.com/trial" className="mt-1.5" />
          </div>

          {/* Features */}
          <div>
            <Label>Tính năng nổi bật</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} placeholder="VD: AI-powered search" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())} />
              <Button type="button" size="sm" variant="outline" onClick={addFeature}><Plus className="h-4 w-4" /></Button>
            </div>
            {form.features.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.features.map((f, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {f}
                    <button onClick={() => removeFeature(i)} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Media */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Logo URL</Label>
              <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://...logo.png" className="mt-1.5" />
            </div>
            <div>
              <Label>Video demo URL</Label>
              <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="mt-1.5" />
            </div>
          </div>

          {/* Maker comment */}
          <div>
            <Label>Lời giới thiệu từ Maker</Label>
            <Textarea value={form.maker_comment} onChange={(e) => setForm({ ...form, maker_comment: e.target.value })} placeholder="Chia sẻ câu chuyện sản phẩm..." rows={3} className="mt-1.5" />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Đang tạo..." : "🚀 Tạo Launch"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
