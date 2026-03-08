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
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Save, Globe, Code, FolderCog, Brain, Key, Eye, EyeOff, CheckCircle2, XCircle, Loader2,
  Settings2, Share2, Blocks, RotateCcw, Plus, Trash2, Download, Upload, Zap, BarChart3,
  Activity, Clock, AlertTriangle, Megaphone
} from "lucide-react";
import { AdsSettingsTab } from "@/components/admin/AdsSettingsTab";
import { MODULE_DEFINITIONS, MODULE_CATEGORIES, useModules } from "@/hooks/useModules";
import { logAuditAction } from "@/hooks/useAuditLog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const AI_PROVIDERS = [
  { id: "openai", name: "OpenAI", keyField: "openai_api_key", placeholder: "sk-..." },
  { id: "anthropic", name: "Anthropic (Claude)", keyField: "anthropic_api_key", placeholder: "sk-ant-..." },
  { id: "gemini", name: "Google Gemini", keyField: "gemini_api_key", placeholder: "AIza..." },
  { id: "openrouter", name: "OpenRouter", keyField: "openrouter_api_key", placeholder: "sk-or-..." },
  { id: "xai", name: "xAI (Grok)", keyField: "xai_api_key", placeholder: "xai-..." },
  { id: "cerebras", name: "Cerebras", keyField: "cerebras_api_key", placeholder: "csk-..." },
  { id: "cometapi", name: "CometAPI", keyField: "cometapi_api_key", placeholder: "sk-..." },
  { id: "perplexity", name: "Perplexity", keyField: "perplexity_api_key", placeholder: "pplx-..." },
  { id: "firecrawl", name: "Firecrawl", keyField: "firecrawl_api_key", placeholder: "fc-..." },
];

const PROVIDER_OPTIONS = [
  { id: "lovable", name: "Lovable Gateway" },
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic (Claude)" },
  { id: "gemini", name: "Google Gemini" },
  { id: "openrouter", name: "OpenRouter" },
  { id: "xai", name: "xAI (Grok)" },
  { id: "cerebras", name: "Cerebras" },
  { id: "cometapi", name: "CometAPI" },
  { id: "perplexity", name: "Perplexity" },
];

const FEATURES = [
  { id: "ai_chat", label: "AI Chat", desc: "Chatbot tư vấn" },
  { id: "ai_search", label: "AI Search", desc: "Tìm kiếm thông minh" },
  { id: "blog_generation", label: "Blog Generation", desc: "Tạo bài viết blog" },
  { id: "tool_article", label: "Tool Article", desc: "Bài giới thiệu công cụ" },
  { id: "review_generation", label: "Review Generation", desc: "Tạo review tự động" },
  { id: "workflow_generation", label: "Workflow Generation", desc: "Tạo workflow" },
  { id: "translation", label: "Translation", desc: "Dịch nội dung" },
  { id: "content_generation", label: "Content (Fallback)", desc: "Fallback chung" },
];

const CHART_COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--accent))",
];

interface FeatureConfig {
  provider: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

function parseFeatureConfig(raw: any): FeatureConfig {
  if (!raw) return { provider: "lovable" };
  if (typeof raw === "string") return { provider: raw };
  return { provider: raw.provider || "lovable", model: raw.model, temperature: raw.temperature, max_tokens: raw.max_tokens };
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { modulesConfig, saveMutation: saveModulesMutation } = useModules();
  const [localModules, setLocalModules] = useState<Record<string, boolean>>({});
  const [gaId, setGaId] = useState("");
  const [headScripts, setHeadScripts] = useState("");
  const [bodyScripts, setBodyScripts] = useState("");
  const [defaultCategoryId, setDefaultCategoryId] = useState("");

  // AI Keys
  const [aiKeys, setAiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyConfigured, setKeyConfigured] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showBackupKeys, setShowBackupKeys] = useState<Record<string, boolean>>({});
  const [deepTestResults, setDeepTestResults] = useState<Record<string, { success: boolean; reply?: string; model?: string; duration_ms?: number; error?: string }>>({});
  const [bulkTesting, setBulkTesting] = useState(false);

  // Provider config per feature
  const [featureConfigs, setFeatureConfigs] = useState<Record<string, FeatureConfig>>({});
  const [modelCatalog, setModelCatalog] = useState<Record<string, string[]>>({});

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

  const { data: usageStats } = useQuery({
    queryKey: ["admin-ai-usage"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "get_usage_stats", days: 7 },
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (settings) {
      setGaId(settings.ga_measurement_id || "");
      setHeadScripts(settings.custom_head_scripts || "");
      setBodyScripts(settings.custom_body_scripts || "");
      setDefaultCategoryId(settings.default_category_id || "");
    }
  }, [settings]);

  useEffect(() => { setLocalModules(modulesConfig); }, [modulesConfig]);

  useEffect(() => {
    if (aiKeyData) {
      setKeyConfigured(aiKeyData.ai_keys_configured || {});
      if (aiKeyData.model_catalog) setModelCatalog(aiKeyData.model_catalog);
      if (aiKeyData.ai_provider_config) {
        const configs: Record<string, FeatureConfig> = {};
        for (const f of FEATURES) {
          configs[f.id] = parseFeatureConfig(aiKeyData.ai_provider_config[f.id]);
        }
        setFeatureConfigs(configs);
      }
      if (aiKeyData.site_info) setSiteInfo(prev => ({ ...prev, ...aiKeyData.site_info }));
    }
  }, [aiKeyData]);

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

  const saveProviderMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "save_provider_config", provider_config: featureConfigs },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-keys"] });
      toast.success("Đã lưu cấu hình AI");
    },
    onError: () => toast.error("Lỗi khi lưu"),
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (keyField: string) => {
      const { error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "delete_key", key_field: keyField },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-keys"] });
      toast.success("Đã xóa key");
    },
    onError: () => toast.error("Lỗi khi xóa key"),
  });

  const testConnection = async (providerId: string, keyFieldOverride?: string) => {
    const keyField = keyFieldOverride || AI_PROVIDERS.find(p => p.id === providerId)?.keyField || "";
    const key = aiKeys[keyField] || "";
    if (!key || key.includes("...")) {
      toast.error("Nhập API key trước khi test");
      return;
    }
    setTestingProvider(providerId + (keyFieldOverride?.includes("_2") ? "_2" : ""));
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

  const deepTest = async (providerId: string, keyFieldOverride?: string) => {
    const keyField = keyFieldOverride || AI_PROVIDERS.find(p => p.id === providerId)?.keyField || "";
    const key = aiKeys[keyField] || "";
    if (!key || key.includes("...")) {
      toast.error("Nhập API key trước khi test");
      return;
    }
    const testId = providerId + (keyFieldOverride?.includes("_2") ? "_2" : "");
    setTestingProvider(testId);
    try {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "deep_test", test_provider: providerId, test_key: key },
      });
      if (error) throw error;
      setDeepTestResults(prev => ({ ...prev, [testId]: data }));
      if (data?.success) toast.success(`${providerId}: "${data.reply}" (${data.duration_ms}ms)`);
      else toast.error(`${providerId}: Deep test thất bại - ${data?.error?.slice(0, 100)}`);
    } catch {
      toast.error("Lỗi khi deep test");
    } finally {
      setTestingProvider(null);
    }
  };

  const bulkTestAll = async () => {
    setBulkTesting(true);
    const configuredProviders = AI_PROVIDERS.filter(p => p.id !== "firecrawl" && keyConfigured[p.keyField]);
    let success = 0;
    let fail = 0;
    for (const provider of configuredProviders) {
      try {
        const { data } = await supabase.functions.invoke("manage-ai-keys", {
          body: { action: "test", test_provider: provider.id, test_key: "__configured__" },
        });
        // Since we can't pass the actual key from server, we just do auth test with stored key approach
        // For bulk test, we need the keys stored already - use deep_test with stored keys
        if (data?.success) success++;
        else fail++;
      } catch {
        fail++;
      }
    }
    toast.info(`Bulk test: ${success} thành công, ${fail} thất bại (${configuredProviders.length} providers)`);
    setBulkTesting(false);
  };

  const exportConfig = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "export_config" },
      });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data.config, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã export cấu hình AI");
    } catch {
      toast.error("Lỗi khi export");
    }
  };

  const importConfig = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const config = JSON.parse(text);
        const { error } = await supabase.functions.invoke("manage-ai-keys", {
          body: { action: "import_config", config },
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["admin-ai-keys"] });
        toast.success("Đã import cấu hình AI");
      } catch {
        toast.error("File JSON không hợp lệ");
      }
    };
    input.click();
  };

  const updateFeatureConfig = (featureId: string, updates: Partial<FeatureConfig>) => {
    setFeatureConfigs(prev => ({
      ...prev,
      [featureId]: { ...(prev[featureId] || { provider: "lovable" }), ...updates },
    }));
  };

  const getModelsForProvider = (provider: string) => modelCatalog[provider] || [];

  // Build provider overview data
  const providerOverview = PROVIDER_OPTIONS.map(p => {
    const featuresUsing = FEATURES.filter(f => (featureConfigs[f.id]?.provider || "lovable") === p.id);
    const isLovable = p.id === "lovable";
    const keyField = AI_PROVIDERS.find(ap => ap.id === p.id)?.keyField;
    const hasKey = isLovable || (keyField ? keyConfigured[keyField] : false);
    return { ...p, featuresUsing, hasKey, isLovable };
  }).filter(p => p.featuresUsing.length > 0 || p.hasKey);

  // Usage chart data
  const usageChartData = usageStats?.by_day
    ? Object.entries(usageStats.by_day as Record<string, number>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, count]) => ({ day: day.slice(5), calls: count }))
    : [];

  const isDev = window.location.hostname.includes("localhost") || window.location.hostname.includes("preview") || window.location.hostname.includes("lovable");

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Cài đặt Website</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Cấu hình AI providers, analytics, site info</p>
          </div>
          <Badge variant={isDev ? "secondary" : "destructive"} className="text-xs ml-auto">
            {isDev ? "🔧 Development" : "🚀 Production"}
          </Badge>
        </div>

        <Tabs defaultValue="ai" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="ai" className="gap-1.5 text-xs md:text-sm"><Brain className="h-3.5 w-3.5" /> AI</TabsTrigger>
            <TabsTrigger value="site" className="gap-1.5 text-xs md:text-sm"><Settings2 className="h-3.5 w-3.5" /> Site</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs md:text-sm"><Globe className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
            <TabsTrigger value="scripts" className="gap-1.5 text-xs md:text-sm"><Code className="h-3.5 w-3.5" /> Scripts</TabsTrigger>
            <TabsTrigger value="modules" className="gap-1.5 text-xs md:text-sm"><Blocks className="h-3.5 w-3.5" /> Modules</TabsTrigger>
            <TabsTrigger value="danger" className="gap-1.5 text-xs md:text-sm text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Danger</TabsTrigger>
          </TabsList>

          {/* AI PROVIDERS TAB */}
          <TabsContent value="ai" className="space-y-6">

            {/* Provider Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Tổng quan Provider</CardTitle>
                <CardDescription>Trạng thái các provider đang được sử dụng</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Trạng thái Key</TableHead>
                        <TableHead>Features đang dùng</TableHead>
                        <TableHead className="text-right">Calls (7d)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providerOverview.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>
                            {p.isLovable ? (
                              <Badge className="text-xs gap-1 bg-primary/10 text-primary border-primary/20"><Zap className="h-3 w-3" /> Built-in</Badge>
                            ) : p.hasKey ? (
                              <Badge variant="default" className="text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Configured</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs gap-1"><XCircle className="h-3 w-3" /> Missing</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {p.featuresUsing.length > 0 ? p.featuresUsing.map(f => (
                                <Badge key={f.id} variant="outline" className="text-xs">{f.label}</Badge>
                              )) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {(usageStats?.by_provider as Record<string, any>)?.[p.id]?.count || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* AI Usage Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> AI Usage (7 ngày)</CardTitle>
                <CardDescription>
                  Tổng cộng: {usageStats?.total_calls || 0} lượt gọi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usageChartData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={usageChartData}>
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Bar dataKey="calls" radius={[4, 4, 0, 0]}>
                          {usageChartData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                    Chưa có dữ liệu usage
                  </div>
                )}

                {/* Stats by provider */}
                {usageStats?.by_provider && Object.keys(usageStats.by_provider).length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(usageStats.by_provider as Record<string, any>).map(([provider, stats]) => (
                      <div key={provider} className="p-3 rounded-lg border border-border space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{provider}</span>
                          <Badge variant={stats.errors > 0 ? "destructive" : "default"} className="text-xs">
                            {stats.count} calls
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {stats.avg_duration}ms</span>
                          <span>{stats.tokens.toLocaleString()} tokens</span>
                          {stats.errors > 0 && (
                            <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" /> {stats.errors} lỗi</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Keys Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> API Keys</CardTitle>
                    <CardDescription>Cấu hình API keys cho các AI provider. Hỗ trợ primary + backup key.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={bulkTestAll} disabled={bulkTesting}>
                    {bulkTesting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                    Test tất cả
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {AI_PROVIDERS.filter(p => p.id !== "firecrawl").map((provider) => {
                  const backupField = provider.keyField + "_2";
                  const hasBackup = showBackupKeys[provider.id] || keyConfigured[backupField];
                  const testId = provider.id;
                  const deepResult = deepTestResults[testId];
                  return (
                    <div key={provider.id} className="p-3 rounded-lg border border-border space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Label className="font-medium">{provider.name}</Label>
                            {keyConfigured[provider.keyField] ? (
                              <Badge variant="default" className="text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Primary</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs gap-1"><XCircle className="h-3 w-3" /> Chưa cấu hình</Badge>
                            )}
                            {keyConfigured[backupField] && (
                              <Badge variant="outline" className="text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Backup</Badge>
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
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            variant="outline" size="sm"
                            disabled={!!testingProvider || !aiKeys[provider.keyField]}
                            onClick={() => testConnection(provider.id)}
                          >
                            {testingProvider === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            disabled={!!testingProvider || !aiKeys[provider.keyField]}
                            onClick={() => deepTest(provider.id)}
                            title="Deep test: gửi prompt thực tế"
                          >
                            {testingProvider === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                          </Button>
                          {keyConfigured[provider.keyField] && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => { if (confirm(`Xóa primary key của ${provider.name}?`)) deleteKeyMutation.mutate(provider.keyField); }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {!hasBackup && (
                            <Button variant="ghost" size="sm" onClick={() => setShowBackupKeys(prev => ({ ...prev, [provider.id]: true }))}>
                              <Plus className="h-3.5 w-3.5 mr-1" /> Backup
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* Deep test result */}
                      {deepResult && (
                        <div className={`text-xs p-2 rounded border ${deepResult.success ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"}`}>
                          {deepResult.success ? (
                            <span>✅ Model: <strong>{deepResult.model}</strong> — Reply: "{deepResult.reply}" — {deepResult.duration_ms}ms</span>
                          ) : (
                            <span>❌ {deepResult.error?.slice(0, 150)}</span>
                          )}
                        </div>
                      )}
                      {/* Backup key row */}
                      {hasBackup && (
                        <div className="flex items-center gap-3 pl-4 border-l-2 border-muted">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Backup Key</Label>
                            <div className="relative max-w-md">
                              <Input
                                type={showKeys[provider.id + "_2"] ? "text" : "password"}
                                placeholder={keyConfigured[backupField] ? aiKeyData?.ai_keys_masked?.[backupField] || "••••••••" : provider.placeholder}
                                value={aiKeys[backupField] || ""}
                                onChange={(e) => setAiKeys(prev => ({ ...prev, [backupField]: e.target.value }))}
                                className="pr-10 font-mono text-sm"
                              />
                              <Button
                                variant="ghost" size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={() => setShowKeys(prev => ({ ...prev, [provider.id + "_2"]: !prev[provider.id + "_2"] }))}
                              >
                                {showKeys[provider.id + "_2"] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline" size="sm"
                              disabled={!!testingProvider || !aiKeys[backupField]}
                              onClick={() => testConnection(provider.id, backupField)}
                            >
                              {testingProvider === provider.id + "_2" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                            </Button>
                            {keyConfigured[backupField] && (
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => { if (confirm(`Xóa backup key của ${provider.name}?`)) deleteKeyMutation.mutate(backupField); }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Firecrawl separate */}
                {AI_PROVIDERS.filter(p => p.id === "firecrawl").map((provider) => (
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
                        <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowKeys(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}>
                          {showKeys[provider.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={!!testingProvider || !aiKeys[provider.keyField]}
                        onClick={() => testConnection(provider.id)}>
                        {testingProvider === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                      </Button>
                      {keyConfigured[provider.keyField] && (
                        <Button variant="ghost" size="sm"
                          onClick={() => { if (confirm(`Xóa key của ${provider.name}?`)) deleteKeyMutation.mutate(provider.keyField); }}
                          className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button onClick={() => saveAIKeysMutation.mutate()} disabled={saveAIKeysMutation.isPending || Object.keys(aiKeys).length === 0}>
                  <Save className="mr-2 h-4 w-4" /> {saveAIKeysMutation.isPending ? "Đang lưu..." : "Lưu API Keys"}
                </Button>
              </CardContent>
            </Card>

            {/* Per-feature AI Config */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> Cấu hình AI theo tính năng</CardTitle>
                    <CardDescription>Chọn provider, model, và tham số cho từng tính năng. Lovable Gateway là mặc định.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportConfig}>
                      <Download className="h-4 w-4 mr-1" /> Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={importConfig}>
                      <Upload className="h-4 w-4 mr-1" /> Import
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {FEATURES.map((feature) => {
                  const fc = featureConfigs[feature.id] || { provider: "lovable" };
                  const models = getModelsForProvider(fc.provider);
                  return (
                    <div key={feature.id} className="p-4 rounded-lg border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="font-medium">{feature.label}</Label>
                          <p className="text-xs text-muted-foreground">{feature.desc}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => updateFeatureConfig(feature.id, { provider: "lovable", model: undefined, temperature: undefined, max_tokens: undefined })}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Provider</Label>
                          <Select value={fc.provider} onValueChange={(v) => updateFeatureConfig(feature.id, { provider: v, model: undefined })}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PROVIDER_OPTIONS.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Model</Label>
                          {models.length > 0 ? (
                            <Select value={fc.model || "default"} onValueChange={(v) => updateFeatureConfig(feature.id, { model: v === "default" ? undefined : v })}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Mặc định" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">Mặc định</SelectItem>
                                {models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input value={fc.model || ""} onChange={(e) => updateFeatureConfig(feature.id, { model: e.target.value || undefined })}
                              placeholder="Mặc định" className="h-9 text-sm" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Temperature: {fc.temperature ?? "auto"}</Label>
                          <div className="flex items-center gap-2 pt-1">
                            <Slider
                              value={[fc.temperature ?? 0.7]}
                              min={0} max={1} step={0.1}
                              onValueChange={([v]) => updateFeatureConfig(feature.id, { temperature: v })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Max Tokens</Label>
                          <Input type="number" value={fc.max_tokens || ""} onChange={(e) => updateFeatureConfig(feature.id, { max_tokens: e.target.value ? parseInt(e.target.value) : undefined })}
                            placeholder="Auto" className="h-9 text-sm" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Button onClick={() => saveProviderMutation.mutate()} disabled={saveProviderMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" /> {saveProviderMutation.isPending ? "Đang lưu..." : "Lưu cấu hình AI"}
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

          {/* MODULES TAB */}
          <TabsContent value="modules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Blocks className="h-5 w-5" /> Quản lý Module</CardTitle>
                <CardDescription>Bật/tắt các tính năng của website. Module tắt sẽ ẩn khỏi menu và giao diện.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(MODULE_CATEGORIES).map(([catKey, catLabel]) => {
                  const modules = MODULE_DEFINITIONS.filter((m) => m.category === catKey);
                  if (modules.length === 0) return null;
                  return (
                    <div key={catKey} className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{catLabel}</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {modules.map((mod) => (
                          <div
                            key={mod.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${localModules[mod.id] ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}
                          >
                            <span className="text-xl mt-0.5">{mod.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <Label className="font-medium text-sm">{mod.label}</Label>
                                <Switch
                                  checked={localModules[mod.id] ?? false}
                                  onCheckedChange={(v) => setLocalModules((prev) => ({ ...prev, [mod.id]: v }))}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Button
              onClick={() => {
                saveModulesMutation.mutate(localModules);
                logAuditAction("modules_save", "site_settings", undefined, { modules: localModules });
                toast.success("Đã lưu cấu hình module");
              }}
              disabled={saveModulesMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" /> {saveModulesMutation.isPending ? "Đang lưu..." : "Lưu cấu hình Module"}
            </Button>
          </TabsContent>

          {/* DANGER ZONE TAB */}
          <TabsContent value="danger" className="space-y-6">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Danger Zone</CardTitle>
                <CardDescription>Các thao tác nguy hiểm, không thể hoàn tác</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-destructive/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Reset tất cả cài đặt</p>
                    <p className="text-xs text-muted-foreground">Xóa tất cả site_settings, khôi phục về mặc định</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={async () => {
                    if (!confirm("⚠️ Xóa TẤT CẢ cài đặt? Hành động này không thể hoàn tác!")) return;
                    if (!confirm("Xác nhận lần 2: Bạn chắc chắn muốn reset?")) return;
                    const { error } = await supabase.from("site_settings").delete().neq("key", "");
                    if (error) { toast.error("Lỗi reset"); return; }
                    queryClient.invalidateQueries({ queryKey: ["admin-site-settings"] });
                    await logAuditAction("reset_all_settings", "site_settings");
                    toast.success("Đã reset tất cả cài đặt");
                  }}>
                    Reset All Settings
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border border-destructive/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Xóa cache translations</p>
                    <p className="text-xs text-muted-foreground">Xóa tất cả bản dịch tự động (is_auto = true)</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={async () => {
                    if (!confirm("Xóa tất cả bản dịch tự động?")) return;
                    const { error } = await supabase.from("translations").delete().eq("is_auto", true);
                    if (error) { toast.error("Lỗi xóa"); return; }
                    await logAuditAction("clear_auto_translations", "translations");
                    toast.success("Đã xóa bản dịch tự động");
                  }}>
                    Clear Auto Translations
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border border-destructive/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Xóa search logs</p>
                    <p className="text-xs text-muted-foreground">Xóa toàn bộ lịch sử tìm kiếm</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={async () => {
                    if (!confirm("Xóa toàn bộ search logs?")) return;
                    const { error } = await supabase.from("search_logs").delete().neq("id", "");
                    if (error) { toast.error("Lỗi xóa"); return; }
                    await logAuditAction("clear_search_logs", "search_logs");
                    toast.success("Đã xóa search logs");
                  }}>
                    Clear Search Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
