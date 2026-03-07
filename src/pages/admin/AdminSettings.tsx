import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Globe, Code, FolderCog, Brain, Key, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Settings2, Share2, Blocks } from "lucide-react";
import { MODULE_DEFINITIONS, MODULE_CATEGORIES, useModules } from "@/hooks/useModules";
import { logAuditAction } from "@/hooks/useAuditLog";

const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", keyField: "openai_api_key", placeholder: "sk-..." },
  { id: "gemini", name: "Google Gemini", keyField: "gemini_api_key", placeholder: "AIza..." },
  { id: "cometapi", name: "CometAPI", keyField: "cometapi_api_key", placeholder: "sk-..." },
  { id: "perplexity", name: "Perplexity", keyField: "perplexity_api_key", placeholder: "pplx-..." },
  { id: "firecrawl", name: "Firecrawl", keyField: "firecrawl_api_key", placeholder: "fc-..." },
];

const FEATURES = [
  { id: "ai_chat", label: "AI Chat" },
  { id: "ai_search", label: "AI Search" },
  { id: "content_generation", label: "Tạo nội dung (Blog, Review, Article)" },
];

export default function AdminSettings() {
  const queryClient = useQueryClient();

  // Analytics & Scripts
  const [gaId, setGaId] = useState("");
  const [headScripts, setHeadScripts] = useState("");
  const [bodyScripts, setBodyScripts] = useState("");
  const [defaultCategoryId, setDefaultCategoryId] = useState("");

  // AI Keys
  const [aiKeys, setAiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyConfigured, setKeyConfigured] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Provider config
  const [providerConfig, setProviderConfig] = useState<Record<string, string>>({
    ai_chat: "lovable", ai_search: "lovable", content_generation: "lovable",
  });

  // Site info
  const [siteInfo, setSiteInfo] = useState({
    site_name: "", site_description: "", site_logo_url: "", default_language: "vi",
    contact_email: "", footer_copyright: "", maintenance_mode: false,
    social_facebook: "", social_twitter: "", social_youtube: "",
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, icon").is("parent_id", null).order("sort_order");
      return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      const map: Record<string, any> = {};
      data?.forEach((row: any) => { map[row.key] = typeof row.value === "string" ? JSON.parse(row.value) : row.value; });
      return map;
    },
  });

  // Load AI keys info from edge function
  const { data: aiKeyData } = useQuery({
    queryKey: ["admin-ai-keys"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "get" },
      });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setGaId(settings.ga_measurement_id || "");
      setHeadScripts(settings.custom_head_scripts || "");
      setBodyScripts(settings.custom_body_scripts || "");
      setDefaultCategoryId(settings.default_category_id || "");
    }
  }, [settings]);

  useEffect(() => {
    if (aiKeyData) {
      setKeyConfigured(aiKeyData.ai_keys_configured || {});
      if (aiKeyData.ai_provider_config) setProviderConfig(aiKeyData.ai_provider_config);
      if (aiKeyData.site_info) setSiteInfo(prev => ({ ...prev, ...aiKeyData.site_info }));
    }
  }, [aiKeyData]);

  // Save general settings
  const saveGeneralMutation = useMutation({
    mutationFn: async () => {
      const entries = [
        { key: "ga_measurement_id", value: gaId },
        { key: "custom_head_scripts", value: headScripts },
        { key: "custom_body_scripts", value: bodyScripts },
        { key: "default_category_id", value: defaultCategoryId },
        { key: "site_info", value: siteInfo },
      ];
      for (const entry of entries) {
        await supabase.from("site_settings").upsert(
          { key: entry.key, value: typeof entry.value === "string" ? JSON.stringify(entry.value) : entry.value as any, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-settings"] });
      logAuditAction("settings_save", "site_settings", undefined, { keys: ["ga_measurement_id", "site_info"] });
      toast.success("Đã lưu cài đặt");
    },
    onError: () => toast.error("Lỗi khi lưu cài đặt"),
  });

  // Save AI keys
  const saveAIKeysMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "save_keys", keys: aiKeys },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-keys"] });
      setAiKeys({});
      toast.success("Đã lưu API keys");
    },
    onError: () => toast.error("Lỗi khi lưu API keys"),
  });

  // Save provider config
  const saveProviderMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "save_provider_config", provider_config: providerConfig },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-keys"] });
      toast.success("Đã lưu cấu hình provider");
    },
    onError: () => toast.error("Lỗi khi lưu"),
  });

  // Test connection
  const testConnection = async (providerId: string) => {
    const keyField = AI_PROVIDERS.find(p => p.id === providerId)?.keyField;
    const key = aiKeys[keyField || ""] || "";
    if (!key || key.includes("...")) {
      toast.error("Nhập API key trước khi test");
      return;
    }
    setTestingProvider(providerId);
    try {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "test", test_provider: providerId, test_key: key },
      });
      if (error) throw error;
      if (data?.success) toast.success(`${providerId}: Kết nối thành công!`);
      else toast.error(`${providerId}: Kết nối thất bại (${data?.status || data?.error})`);
    } catch {
      toast.error("Lỗi khi test kết nối");
    } finally {
      setTestingProvider(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Cài đặt Website</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Cấu hình AI providers, analytics, site info</p>
        </div>

        <Tabs defaultValue="ai" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="ai" className="gap-1.5 text-xs md:text-sm"><Brain className="h-3.5 w-3.5" /> AI</TabsTrigger>
            <TabsTrigger value="site" className="gap-1.5 text-xs md:text-sm"><Settings2 className="h-3.5 w-3.5" /> Site</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs md:text-sm"><Globe className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
            <TabsTrigger value="scripts" className="gap-1.5 text-xs md:text-sm"><Code className="h-3.5 w-3.5" /> Scripts</TabsTrigger>
          </TabsList>

          {/* AI PROVIDERS TAB */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> API Keys</CardTitle>
                <CardDescription>Cấu hình API keys cho các AI provider. Keys được mã hóa và lưu an toàn.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {AI_PROVIDERS.map((provider) => (
                  <div key={provider.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">{provider.name}</Label>
                        {keyConfigured[provider.keyField] ? (
                          <Badge variant="default" className="text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Đã cấu hình</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1"><XCircle className="h-3 w-3" /> Chưa cấu hình</Badge>
                        )}
                      </div>
                      <div className="relative max-w-md">
                        <Input
                          type={showKeys[provider.id] ? "text" : "password"}
                          placeholder={keyConfigured[provider.keyField] ? aiKeyData?.ai_keys_masked?.[provider.keyField] || "••••••••" : provider.placeholder}
                          value={aiKeys[provider.keyField] || ""}
                          onChange={(e) => setAiKeys(prev => ({ ...prev, [provider.keyField]: e.target.value }))}
                          className="pr-10 font-mono text-sm"
                        />
                        <Button
                          variant="ghost" size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                        >
                          {showKeys[provider.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="outline" size="sm"
                      disabled={testingProvider === provider.id || !aiKeys[provider.keyField]}
                      onClick={() => testConnection(provider.id)}
                    >
                      {testingProvider === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                    </Button>
                  </div>
                ))}
                <Button onClick={() => saveAIKeysMutation.mutate()} disabled={saveAIKeysMutation.isPending || Object.keys(aiKeys).length === 0}>
                  <Save className="mr-2 h-4 w-4" /> {saveAIKeysMutation.isPending ? "Đang lưu..." : "Lưu API Keys"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> Provider mặc định</CardTitle>
                <CardDescription>Chọn AI provider cho từng tính năng. Lovable Gateway là mặc định (không cần API key).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {FEATURES.map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between max-w-lg">
                    <Label>{feature.label}</Label>
                    <Select
                      value={providerConfig[feature.id] || "lovable"}
                      onValueChange={(v) => setProviderConfig(prev => ({ ...prev, [feature.id]: v }))}
                    >
                      <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lovable">Lovable Gateway</SelectItem>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="cometapi">CometAPI</SelectItem>
                        <SelectItem value="perplexity">Perplexity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                <Button onClick={() => saveProviderMutation.mutate()} disabled={saveProviderMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" /> Lưu cấu hình
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SITE INFO TAB */}
          <TabsContent value="site" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Thông tin website</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tên website</Label>
                    <Input value={siteInfo.site_name} onChange={(e) => setSiteInfo(p => ({ ...p, site_name: e.target.value }))} placeholder="ToolScope" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input type="email" value={siteInfo.contact_email} onChange={(e) => setSiteInfo(p => ({ ...p, contact_email: e.target.value }))} placeholder="contact@example.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mô tả website</Label>
                  <Textarea value={siteInfo.site_description} onChange={(e) => setSiteInfo(p => ({ ...p, site_description: e.target.value }))} rows={2} placeholder="Nền tảng khám phá công cụ AI hàng đầu..." />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input value={siteInfo.site_logo_url} onChange={(e) => setSiteInfo(p => ({ ...p, site_logo_url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Ngôn ngữ mặc định</Label>
                    <Select value={siteInfo.default_language} onValueChange={(v) => setSiteInfo(p => ({ ...p, default_language: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vi">Tiếng Việt</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Footer Copyright</Label>
                  <Input value={siteInfo.footer_copyright} onChange={(e) => setSiteInfo(p => ({ ...p, footer_copyright: e.target.value }))} placeholder="© 2025 ToolScope. All rights reserved." />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={siteInfo.maintenance_mode} onCheckedChange={(v) => setSiteInfo(p => ({ ...p, maintenance_mode: v }))} />
                  <Label>Chế độ bảo trì</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" /> Mạng xã hội</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Facebook</Label>
                  <Input value={siteInfo.social_facebook} onChange={(e) => setSiteInfo(p => ({ ...p, social_facebook: e.target.value }))} placeholder="https://facebook.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>Twitter / X</Label>
                  <Input value={siteInfo.social_twitter} onChange={(e) => setSiteInfo(p => ({ ...p, social_twitter: e.target.value }))} placeholder="https://x.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>YouTube</Label>
                  <Input value={siteInfo.social_youtube} onChange={(e) => setSiteInfo(p => ({ ...p, social_youtube: e.target.value }))} placeholder="https://youtube.com/@..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FolderCog className="h-5 w-5" /> Danh mục mặc định</CardTitle>
                <CardDescription>Danh mục được gán tự động cho các công cụ chưa được phân loại</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={defaultCategoryId || "__none"} onValueChange={(v) => setDefaultCategoryId(v === "__none" ? "" : v)}>
                  <SelectTrigger className="max-w-md"><SelectValue placeholder="Chọn danh mục..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Không đặt mặc định</SelectItem>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Button onClick={() => saveGeneralMutation.mutate()} disabled={saveGeneralMutation.isPending}>
              <Save className="mr-2 h-4 w-4" /> {saveGeneralMutation.isPending ? "Đang lưu..." : "Lưu tất cả"}
            </Button>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Google Analytics</CardTitle>
                <CardDescription>Nhập Measurement ID để theo dõi lượt truy cập (VD: G-XXXXXXXXXX)</CardDescription>
              </CardHeader>
              <CardContent>
                <Label htmlFor="ga-id">Measurement ID</Label>
                <Input id="ga-id" placeholder="G-XXXXXXXXXX" value={gaId} onChange={(e) => setGaId(e.target.value)} className="mt-1 max-w-md" />
              </CardContent>
            </Card>
            <Button onClick={() => saveGeneralMutation.mutate()} disabled={saveGeneralMutation.isPending}>
              <Save className="mr-2 h-4 w-4" /> Lưu
            </Button>
          </TabsContent>

          {/* SCRIPTS TAB */}
          <TabsContent value="scripts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" /> Custom Scripts</CardTitle>
                <CardDescription>Thêm mã tracking tùy chỉnh (Microsoft Clarity, Facebook Pixel, Hotjar...)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="head-scripts">Scripts trong &lt;head&gt;</Label>
                  <Textarea id="head-scripts" placeholder={'<script>...</script>'} value={headScripts} onChange={(e) => setHeadScripts(e.target.value)} rows={6} className="mt-1 font-mono text-xs" />
                </div>
                <div>
                  <Label htmlFor="body-scripts">Scripts trong &lt;body&gt; (cuối trang)</Label>
                  <Textarea id="body-scripts" placeholder={'<script>...</script>'} value={bodyScripts} onChange={(e) => setBodyScripts(e.target.value)} rows={6} className="mt-1 font-mono text-xs" />
                </div>
              </CardContent>
            </Card>
            <Button onClick={() => saveGeneralMutation.mutate()} disabled={saveGeneralMutation.isPending}>
              <Save className="mr-2 h-4 w-4" /> Lưu
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
