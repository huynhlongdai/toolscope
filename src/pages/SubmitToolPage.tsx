import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SEOHead } from "@/components/seo/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, CheckCircle } from "lucide-react";

export default function SubmitToolPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    website_url: "",
    short_description: "",
    description: "",
    pricing_type: "free",
    category_id: "",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-for-submit"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data ?? [];
    },
  });

  const updateField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast({ title: "Vui lòng đăng nhập", variant: "destructive" }); navigate("/auth"); return; }
    if (!form.name.trim() || !form.website_url.trim()) {
      toast({ title: "Tên và URL là bắt buộc", variant: "destructive" }); return;
    }
    setLoading(true);
    const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 100);
    const { error } = await supabase.from("tools").insert({
      name: form.name.trim(),
      slug,
      website_url: form.website_url.trim(),
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      pricing_type: form.pricing_type as any,
      category_id: form.category_id || null,
      status: "pending_review" as any,
      submitted_by: user.id,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col">
        <SEOHead title="Gửi công cụ - ToolScope" description="Gửi công cụ mới để được đánh giá trên ToolScope" />
        <Header />
        <main className="flex-1 flex items-center justify-center pb-20 md:pb-0">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">Đã gửi thành công!</h2>
              <p className="text-muted-foreground mb-4">Công cụ của bạn đang chờ duyệt. Chúng tôi sẽ xem xét và phê duyệt sớm nhất.</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate("/tools")}>Xem danh sách</Button>
                <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ name: "", website_url: "", short_description: "", description: "", pricing_type: "free", category_id: "" }); }}>
                  Gửi thêm
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SEOHead title="Gửi công cụ mới - ToolScope" description="Gửi công cụ AI/SaaS mới để được đánh giá trên ToolScope" />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Gửi công cụ mới</CardTitle>
              <CardDescription>Giới thiệu công cụ bạn yêu thích để cộng đồng cùng đánh giá</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên công cụ *</Label>
                    <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="VD: ChatGPT" required maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">Website URL *</Label>
                    <Input id="url" type="url" value={form.website_url} onChange={(e) => updateField("website_url", e.target.value)} placeholder="https://..." required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short_desc">Mô tả ngắn</Label>
                  <Input id="short_desc" value={form.short_description} onChange={(e) => updateField("short_description", e.target.value)} placeholder="Mô tả ngắn gọn..." maxLength={200} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Mô tả chi tiết</Label>
                  <Textarea id="desc" value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Chi tiết về công cụ..." rows={4} maxLength={2000} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Loại giá</Label>
                    <Select value={form.pricing_type} onValueChange={(v) => updateField("pricing_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Miễn phí</SelectItem>
                        <SelectItem value="freemium">Freemium</SelectItem>
                        <SelectItem value="paid">Trả phí</SelectItem>
                        <SelectItem value="open_source">Open Source</SelectItem>
                        <SelectItem value="contact">Liên hệ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Danh mục</Label>
                    <Select value={form.category_id || "__none"} onValueChange={(v) => updateField("category_id", v === "__none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Chưa phân loại</SelectItem>
                        {categories.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {!user && (
                  <p className="text-sm text-amber-600">Bạn cần <button type="button" className="underline font-medium" onClick={() => navigate("/auth")}>đăng nhập</button> để gửi công cụ.</p>
                )}
                <Button type="submit" className="w-full" disabled={loading || !user}>
                  <Send className="mr-2 h-4 w-4" />
                  {loading ? "Đang gửi..." : "Gửi công cụ"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
