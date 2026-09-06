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
import { toast } from "sonner";
import { Send, CheckCircle } from "lucide-react";

export default function SubmitToolPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", website_url: "", short_description: "", description: "", pricing_type: "free", category_id: "" });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-for-submit"],
    queryFn: async () => { const { data } = await supabase.from("categories").select("id, name").order("name"); return data ?? []; },
  });

  const updateField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error(t("common.loginRequired")); navigate("/auth"); return; }
    if (!form.name.trim() || !form.website_url.trim()) { toast.error(t("submit.nameUrlRequired")); return; }
    setLoading(true);
    const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 100);
    const { error } = await supabase.from("tools").insert({ name: form.name.trim(), slug, website_url: form.website_url.trim(), short_description: form.short_description.trim() || null, description: form.description.trim() || null, pricing_type: form.pricing_type as any, category_id: form.category_id || null, status: "pending_review" as any, submitted_by: user.id });
    setLoading(false);
    if (error) { toast.error(t("common.error"), { description: error.message }); } else { setSubmitted(true); }
  };

  if (submitted) {
    return (
      <PageLayout title={t("submit.seoTitle")} description={t("submit.seoDesc")}>
        <div className="flex items-center justify-center py-16">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">{t("submit.successTitle")}</h2>
              <p className="text-muted-foreground mb-4">{t("submit.successDesc")}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate("/tools")}>{t("submit.viewList")}</Button>
                <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ name: "", website_url: "", short_description: "", description: "", pricing_type: "free", category_id: "" }); }}>{t("submit.submitMore")}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t("submit.seoTitle")} description={t("submit.seoDesc")}>
        <div className="container py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{t("submit.title")}</CardTitle>
              <CardDescription>{t("submit.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("submit.toolName")}</Label>
                    <Input id="name" value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="VD: ChatGPT" required maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">{t("submit.websiteUrl")}</Label>
                    <Input id="url" type="url" value={form.website_url} onChange={(e) => updateField("website_url", e.target.value)} placeholder="https://..." required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short_desc">{t("submit.shortDesc")}</Label>
                  <Input id="short_desc" value={form.short_description} onChange={(e) => updateField("short_description", e.target.value)} placeholder={t("submit.shortDescPlaceholder")} maxLength={200} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">{t("submit.detailedDesc")}</Label>
                  <Textarea id="desc" value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder={t("submit.detailedDescPlaceholder")} rows={4} maxLength={2000} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("submit.pricingType")}</Label>
                    <Select value={form.pricing_type} onValueChange={(v) => updateField("pricing_type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">{t("pricing.free")}</SelectItem>
                        <SelectItem value="freemium">{t("pricing.freemium")}</SelectItem>
                        <SelectItem value="paid">{t("pricing.paid")}</SelectItem>
                        <SelectItem value="open_source">{t("pricing.open_source")}</SelectItem>
                        <SelectItem value="contact">{t("pricing.contact")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("submit.category")}</Label>
                    <Select value={form.category_id || "__none"} onValueChange={(v) => updateField("category_id", v === "__none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder={t("submit.selectPlaceholder")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">{t("submit.uncategorized")}</SelectItem>
                        {categories.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {!user && (
                  <p className="text-sm text-amber-600">{t("submit.loginHint").replace("{link}", "").split("").length > 0 && <>{t("submit.loginHint").split("{link}")[0]}<button type="button" className="underline font-medium" onClick={() => navigate("/auth")}>{t("submit.loginLink")}</button>{t("submit.loginHint").split("{link}")[1]}</>}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading || !user}>
                  <Send className="mr-2 h-4 w-4" />
                  {loading ? t("common.sending") : t("submit.submitBtn")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
    </PageLayout>
  );
}
