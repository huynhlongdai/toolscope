import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Plus, Trash2, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface Block {
  type: string;
  data: any;
}

const blockTypes = [
  { type: "hero", label: "🎯 Hero" },
  { type: "text", label: "📝 Text (Rich)" },
  { type: "image", label: "🖼️ Image" },
  { type: "cta", label: "📢 CTA" },
  { type: "features", label: "⚡ Features Grid" },
  { type: "faq", label: "❓ FAQ" },
  { type: "video", label: "🎬 Video" },
  { type: "divider", label: "➖ Divider" },
  { type: "testimonials", label: "💬 Testimonials" },
  { type: "pricing", label: "💰 Price Table" },
  { type: "accordion", label: "📋 Accordion" },
  { type: "button", label: "🔘 Button" },
  { type: "countdown", label: "⏳ Countdown" },
  { type: "gallery", label: "🖼️ Gallery / Carousel" },
];

const defaultBlockData: Record<string, any> = {
  hero: { title: "Tiêu đề", subtitle: "Mô tả ngắn", buttonText: "Bắt đầu", buttonUrl: "/" },
  text: { content: "" },
  image: { src: "", alt: "", caption: "" },
  cta: { title: "Call to Action", description: "Mô tả", buttonText: "Click", buttonUrl: "/" },
  features: { title: "Tính năng", items: [{ icon: "⚡", title: "Feature 1", description: "Mô tả" }] },
  faq: { title: "FAQ", items: [{ question: "Câu hỏi?", answer: "Trả lời." }] },
  video: { url: "", title: "" },
  divider: {},
  testimonials: {
    title: "Khách hàng nói gì",
    items: [{ name: "Nguyễn Văn A", role: "CEO, Công ty ABC", quote: "Sản phẩm rất tuyệt vời!", avatar: "" }],
  },
  pricing: {
    title: "Bảng giá",
    plans: [
      { name: "Free", price: "$0", period: "/tháng", features: ["Tính năng A", "Tính năng B"], buttonText: "Bắt đầu", buttonUrl: "#", highlighted: false },
      { name: "Pro", price: "$29", period: "/tháng", features: ["Tất cả Free", "Tính năng C", "Tính năng D"], buttonText: "Nâng cấp", buttonUrl: "#", highlighted: true },
      { name: "Enterprise", price: "Liên hệ", period: "", features: ["Tất cả Pro", "Hỗ trợ riêng"], buttonText: "Liên hệ", buttonUrl: "#", highlighted: false },
    ],
  },
  accordion: {
    title: "Thông tin thêm",
    items: [{ title: "Mục 1", content: "Nội dung mục 1" }],
  },
  button: { text: "Click me", url: "#", variant: "primary", align: "center" },
  countdown: { title: "Ưu đãi kết thúc sau", targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), bgColor: "#6366f1" },
  gallery: {
    title: "Gallery",
    columns: "3",
    items: [{ src: "", alt: "", caption: "" }],
  },
};

export default function AdminPageEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: page } = useQuery({
    queryKey: ["admin-page", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pages").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [status, setStatus] = useState("draft");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.slug);
      setSeoTitle(page.seo_title ?? "");
      setSeoDesc(page.seo_description ?? "");
      setStatus(page.status);
      setBlocks((page.blocks as any) ?? []);
    }
  }, [page]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("pages").update({
      title, slug, seo_title: seoTitle || null, seo_description: seoDesc || null,
      status: status as any, blocks: blocks as any,
    }).eq("id", id!);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Đã lưu"); queryClient.invalidateQueries({ queryKey: ["admin-page", id] }); }
  };

  const addBlock = (type: string) => {
    setBlocks([...blocks, { type, data: JSON.parse(JSON.stringify(defaultBlockData[type] ?? {})) }]);
  };

  const removeBlock = (idx: number) => setBlocks(blocks.filter((_, i) => i !== idx));
  const moveBlock = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const arr = [...blocks];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setBlocks(arr);
  };

  const updateBlockData = (idx: number, data: any) => {
    const arr = [...blocks];
    arr[idx] = { ...arr[idx], data };
    setBlocks(arr);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Page Editor</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild><a href={`/p/${slug}`} target="_blank"><Eye className="mr-2 h-4 w-4" /> Preview</a></Button>
            <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? "Đang lưu..." : "Lưu"}</Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Tiêu đề</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="space-y-2"><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>SEO Title</Label><Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} /></div>
              <div className="space-y-2"><Label>SEO Description</Label><Input value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Thêm Block</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {blockTypes.map(bt => (
                <Button key={bt.type} variant="outline" size="sm" onClick={() => addBlock(bt.type)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> {bt.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {blocks.map((block, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{blockTypes.find(bt => bt.type === block.type)?.label ?? block.type}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBlock(idx, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBlock(idx, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeBlock(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <BlockEditor block={block} onChange={(data) => updateBlockData(idx, data)} />
              </CardContent>
            </Card>
          ))}
          {blocks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              Chưa có block nào. Thêm block từ palette phía trên.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function BlockEditor({ block, onChange }: { block: Block; onChange: (data: any) => void }) {
  const d = block.data;
  const update = (key: string, value: any) => onChange({ ...d, [key]: value });

  switch (block.type) {
    case "hero":
      return (
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Title" value={d.title} onChange={(e) => update("title", e.target.value)} />
          <Input placeholder="Subtitle" value={d.subtitle} onChange={(e) => update("subtitle", e.target.value)} />
          <Input placeholder="Button text" value={d.buttonText} onChange={(e) => update("buttonText", e.target.value)} />
          <Input placeholder="Button URL" value={d.buttonUrl} onChange={(e) => update("buttonUrl", e.target.value)} />
        </div>
      );
    case "text":
      return <RichTextEditor content={d.content} onChange={(v) => update("content", v)} />;
    case "image":
      return (
        <div className="grid grid-cols-3 gap-3">
          <Input placeholder="Image URL" value={d.src} onChange={(e) => update("src", e.target.value)} />
          <Input placeholder="Alt text" value={d.alt} onChange={(e) => update("alt", e.target.value)} />
          <Input placeholder="Caption" value={d.caption} onChange={(e) => update("caption", e.target.value)} />
        </div>
      );
    case "cta":
      return (
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Title" value={d.title} onChange={(e) => update("title", e.target.value)} />
          <Input placeholder="Description" value={d.description} onChange={(e) => update("description", e.target.value)} />
          <Input placeholder="Button text" value={d.buttonText} onChange={(e) => update("buttonText", e.target.value)} />
          <Input placeholder="Button URL" value={d.buttonUrl} onChange={(e) => update("buttonUrl", e.target.value)} />
        </div>
      );
    case "video":
      return (
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Video URL (YouTube)" value={d.url} onChange={(e) => update("url", e.target.value)} />
          <Input placeholder="Title" value={d.title} onChange={(e) => update("title", e.target.value)} />
        </div>
      );
    case "divider":
      return <p className="text-xs text-muted-foreground">Đường phân cách</p>;
    case "features":
      return (
        <div className="space-y-2">
          <Input placeholder="Section title" value={d.title} onChange={(e) => update("title", e.target.value)} />
          {(d.items ?? []).map((item: any, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <Input className="w-16" placeholder="Icon" value={item.icon} onChange={(e) => { const items = [...d.items]; items[i] = { ...items[i], icon: e.target.value }; update("items", items); }} />
              <Input placeholder="Title" value={item.title} onChange={(e) => { const items = [...d.items]; items[i] = { ...items[i], title: e.target.value }; update("items", items); }} />
              <Input placeholder="Description" value={item.description} onChange={(e) => { const items = [...d.items]; items[i] = { ...items[i], description: e.target.value }; update("items", items); }} />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { const items = d.items.filter((_: any, j: number) => j !== i); update("items", items); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => update("items", [...(d.items ?? []), { icon: "✨", title: "", description: "" }])}>
            <Plus className="mr-1 h-3 w-3" /> Thêm feature
          </Button>
        </div>
      );
    case "faq":
      return (
        <div className="space-y-2">
          <Input placeholder="Section title" value={d.title} onChange={(e) => update("title", e.target.value)} />
          {(d.items ?? []).map((item: any, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <Input placeholder="Question" value={item.question} onChange={(e) => { const items = [...d.items]; items[i] = { ...items[i], question: e.target.value }; update("items", items); }} />
              <Textarea placeholder="Answer" value={item.answer} onChange={(e) => { const items = [...d.items]; items[i] = { ...items[i], answer: e.target.value }; update("items", items); }} rows={1} />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { const items = d.items.filter((_: any, j: number) => j !== i); update("items", items); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => update("items", [...(d.items ?? []), { question: "", answer: "" }])}>
            <Plus className="mr-1 h-3 w-3" /> Thêm FAQ
          </Button>
        </div>
      );

    // NEW BLOCKS
    case "testimonials":
      return (
        <div className="space-y-3">
          <Input placeholder="Section title" value={d.title} onChange={(e) => update("title", e.target.value)} />
          {(d.items ?? []).map((item: any, i: number) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Tên" value={item.name} onChange={(e) => { const items = [...d.items]; items[i] = { ...items[i], name: e.target.value }; update("items", items); }} />
                <Input placeholder="Vai trò" value={item.role} onChange={(e) => { const items = [...d.items]; items[i] = { ...items[i], role: e.target.value }; update("items", items); }} />
              </div>
              <Textarea placeholder="Trích dẫn" value={item.quote} onChange={(e) => { const items = [...d.items]; items[i] = { ...items[i], quote: e.target.value }; update("items", items); }} rows={2} />
              <div className="flex gap-2 items-center">
                <Input placeholder="Avatar URL" value={item.avatar || ""} onChange={(e) => { const items = [...d.items]; items[i] = { ...items[i], avatar: e.target.value }; update("items", items); }} />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { const items = d.items.filter((_: any, j: number) => j !== i); update("items", items); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => update("items", [...(d.items ?? []), { name: "", role: "", quote: "", avatar: "" }])}>
            <Plus className="mr-1 h-3 w-3" /> Thêm testimonial
          </Button>
        </div>
      );

    case "pricing":
      return (
        <div className="space-y-3">
          <Input placeholder="Section title" value={d.title} onChange={(e) => update("title", e.target.value)} />
          {(d.plans ?? []).map((plan: any, i: number) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder="Tên gói" value={plan.name} onChange={(e) => { const plans = [...d.plans]; plans[i] = { ...plans[i], name: e.target.value }; update("plans", plans); }} />
                <Input placeholder="Giá" value={plan.price} onChange={(e) => { const plans = [...d.plans]; plans[i] = { ...plans[i], price: e.target.value }; update("plans", plans); }} />
                <Input placeholder="Chu kỳ" value={plan.period} onChange={(e) => { const plans = [...d.plans]; plans[i] = { ...plans[i], period: e.target.value }; update("plans", plans); }} />
                <div className="flex items-center gap-2">
                  <label className="text-xs flex items-center gap-1">
                    <input type="checkbox" checked={plan.highlighted || false} onChange={(e) => { const plans = [...d.plans]; plans[i] = { ...plans[i], highlighted: e.target.checked }; update("plans", plans); }} />
                    Nổi bật
                  </label>
                </div>
              </div>
              <Textarea placeholder="Tính năng (mỗi dòng 1 tính năng)" value={(plan.features ?? []).join("\n")} onChange={(e) => { const plans = [...d.plans]; plans[i] = { ...plans[i], features: e.target.value.split("\n") }; update("plans", plans); }} rows={3} />
              <div className="flex gap-2 items-center">
                <Input placeholder="Button text" value={plan.buttonText} onChange={(e) => { const plans = [...d.plans]; plans[i] = { ...plans[i], buttonText: e.target.value }; update("plans", plans); }} />
                <Input placeholder="Button URL" value={plan.buttonUrl} onChange={(e) => { const plans = [...d.plans]; plans[i] = { ...plans[i], buttonUrl: e.target.value }; update("plans", plans); }} />
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { const plans = d.plans.filter((_: any, j: number) => j !== i); update("plans", plans); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => update("plans", [...(d.plans ?? []), { name: "", price: "", period: "/tháng", features: [], buttonText: "Chọn gói", buttonUrl: "#", highlighted: false }])}>
            <Plus className="mr-1 h-3 w-3" /> Thêm gói
          </Button>
        </div>
      );

    case "accordion":
      return (
        <div className="space-y-2">
          <Input placeholder="Section title" value={d.title} onChange={(e) => update("title", e.target.value)} />
          {(d.items ?? []).map((item: any, i: number) => (
            <div key={i} className="flex gap-2 items-start">
              <Input placeholder="Tiêu đề" value={item.title} onChange={(e) => { const items = [...d.items]; items[i] = { ...items[i], title: e.target.value }; update("items", items); }} />
              <Textarea placeholder="Nội dung" value={item.content} onChange={(e) => { const items = [...d.items]; items[i] = { ...items[i], content: e.target.value }; update("items", items); }} rows={1} />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { const items = d.items.filter((_: any, j: number) => j !== i); update("items", items); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => update("items", [...(d.items ?? []), { title: "", content: "" }])}>
            <Plus className="mr-1 h-3 w-3" /> Thêm mục
          </Button>
        </div>
      );

    case "button":
      return (
        <div className="grid grid-cols-4 gap-3">
          <Input placeholder="Text" value={d.text} onChange={(e) => update("text", e.target.value)} />
          <Input placeholder="URL" value={d.url} onChange={(e) => update("url", e.target.value)} />
          <Select value={d.variant || "primary"} onValueChange={(v) => update("variant", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
            </SelectContent>
          </Select>
          <Select value={d.align || "center"} onValueChange={(v) => update("align", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Trái</SelectItem>
              <SelectItem value="center">Giữa</SelectItem>
              <SelectItem value="right">Phải</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

    case "countdown":
      return (
        <div className="grid grid-cols-3 gap-3">
          <Input placeholder="Tiêu đề" value={d.title} onChange={(e) => update("title", e.target.value)} />
          <Input type="datetime-local" value={d.targetDate || ""} onChange={(e) => update("targetDate", e.target.value)} />
          <Input type="color" value={d.bgColor || "#6366f1"} onChange={(e) => update("bgColor", e.target.value)} title="Màu nền" />
        </div>
      );

    default:
      return <p className="text-sm text-muted-foreground">Unknown block type: {block.type}</p>;
  }
}
