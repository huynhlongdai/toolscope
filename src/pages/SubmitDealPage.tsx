import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Tag, CheckCircle, Send, Gift } from "lucide-react";

export default function SubmitDealPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tool_id: "",
    title: "",
    description: "",
    deal_url: "",
    coupon_code: "",
    discount_type: "percentage",
    discount_value: "",
    original_price: "",
    deal_price: "",
    currency: "USD",
    expires_at: "",
    is_exclusive: false,
  });

  const { data: tools = [] } = useQuery({
    queryKey: ["tools-for-deal-submit"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tools")
        .select("id, name, slug")
        .eq("status", "published")
        .order("name");
      return data ?? [];
    },
  });

  const updateField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(t("common.loginRequired"));
      navigate("/auth");
      return;
    }
    if (!form.tool_id || !form.title.trim()) {
      toast.error("Vui lòng chọn tool và nhập tiêu đề deal");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("deals").insert({
      tool_id: form.tool_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      deal_url: form.deal_url.trim() || null,
      coupon_code: form.coupon_code.trim() || null,
      discount_type: form.discount_type as any,
      discount_value: form.discount_value ? Number(form.discount_value) : null,
      original_price: form.original_price ? Number(form.original_price) : null,
      deal_price: form.deal_price ? Number(form.deal_price) : null,
      currency: form.currency,
      expires_at: form.expires_at || null,
      is_exclusive: form.is_exclusive,
      is_active: false, // pending review
      is_verified: false,
      submitted_by: user.id,
    } as any);
    setLoading(false);

    if (error) {
      toast.error(t("common.error"), { description: error.message });
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <PageLayout title="Gửi Deal - ToolScope" description="Gửi deal, ưu đãi cho cộng đồng">
        <div className="flex items-center justify-center py-16">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">Deal đã được gửi! 🎉</h2>
              <p className="text-muted-foreground mb-4">
                Cảm ơn bạn! Deal sẽ được hiển thị sau khi được xét duyệt.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate("/deals")}>Xem Deals</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    setForm({
                      tool_id: "", title: "", description: "", deal_url: "",
                      coupon_code: "", discount_type: "percentage", discount_value: "",
                      original_price: "", deal_price: "", currency: "USD", expires_at: "",
                      is_exclusive: false,
                    });
                  }}
                >
                  Gửi thêm deal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Gửi Deal - ToolScope" description="Chia sẻ deal, ưu đãi công cụ AI cho cộng đồng ToolScope">
      <div className="container py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Gift className="h-6 w-6 text-primary" />
              Gửi Deal / Ưu đãi
            </CardTitle>
            <CardDescription>
              Chia sẻ deal hot, mã giảm giá, hoặc ưu đãi dùng thử miễn phí cho cộng đồng.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Tool selection */}
              <div className="space-y-2">
                <Label>Tool *</Label>
                <Select value={form.tool_id || "__none"} onValueChange={(v) => updateField("tool_id", v === "__none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tool..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none" disabled>Chọn tool...</SelectItem>
                    {tools.map((tool: any) => (
                      <SelectItem key={tool.id} value={tool.id}>{tool.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title & URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deal-title">Tiêu đề deal *</Label>
                  <Input
                    id="deal-title"
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="VD: Giảm 50% gói Pro 1 năm"
                    required
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deal-url">Link deal</Label>
                  <Input
                    id="deal-url"
                    type="url"
                    value={form.deal_url}
                    onChange={(e) => updateField("deal_url", e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="deal-desc">Mô tả chi tiết</Label>
                <Textarea
                  id="deal-desc"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Mô tả thêm về deal, điều kiện áp dụng..."
                  rows={3}
                  maxLength={1000}
                />
              </div>

              {/* Discount info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Loại giảm giá</Label>
                  <Select value={form.discount_type} onValueChange={(v) => updateField("discount_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Phần trăm (%)</SelectItem>
                      <SelectItem value="fixed">Số tiền cố định</SelectItem>
                      <SelectItem value="free_trial">Dùng thử miễn phí</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.discount_type !== "free_trial" && (
                  <div className="space-y-2">
                    <Label htmlFor="discount-val">
                      Giảm {form.discount_type === "percentage" ? "(%)" : `(${form.currency})`}
                    </Label>
                    <Input
                      id="discount-val"
                      type="number"
                      min={0}
                      value={form.discount_value}
                      onChange={(e) => updateField("discount_value", e.target.value)}
                      placeholder={form.discount_type === "percentage" ? "50" : "10"}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Tiền tệ</Label>
                  <Select value={form.currency} onValueChange={(v) => updateField("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="VND">VND (₫)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orig-price">Giá gốc</Label>
                  <Input
                    id="orig-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.original_price}
                    onChange={(e) => updateField("original_price", e.target.value)}
                    placeholder="99.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deal-price">Giá deal</Label>
                  <Input
                    id="deal-price"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.deal_price}
                    onChange={(e) => updateField("deal_price", e.target.value)}
                    placeholder="49.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coupon">Mã coupon</Label>
                  <Input
                    id="coupon"
                    value={form.coupon_code}
                    onChange={(e) => updateField("coupon_code", e.target.value.toUpperCase())}
                    placeholder="SAVE50"
                    maxLength={50}
                  />
                </div>
              </div>

              {/* Expiry + Exclusive */}
              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="expires">Hết hạn</Label>
                  <Input
                    id="expires"
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => updateField("expires_at", e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 pb-1">
                  <Switch
                    checked={form.is_exclusive}
                    onCheckedChange={(v) => updateField("is_exclusive", v)}
                  />
                  <Label className="cursor-pointer">Deal độc quyền ToolScope</Label>
                </div>
              </div>

              {!user && (
                <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                  ⚠️ Bạn cần{" "}
                  <button type="button" className="underline font-medium" onClick={() => navigate("/auth")}>
                    đăng nhập
                  </button>{" "}
                  để gửi deal.
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading || !user}>
                <Send className="mr-2 h-4 w-4" />
                {loading ? "Đang gửi..." : "Gửi Deal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
