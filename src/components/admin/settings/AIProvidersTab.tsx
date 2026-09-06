import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Save, Brain, Key, Eye, EyeOff, CheckCircle2, XCircle, Loader2,
  RotateCcw, Plus, Trash2, Download, Upload, Zap, BarChart3,
  Activity, Clock, AlertTriangle, RefreshCw, Globe
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  AI_PROVIDERS, PROVIDER_OPTIONS, FEATURES, CHART_COLORS,
  parseFeatureConfig, type FeatureConfig, type DeepTestResult, type CustomProvider,
} from "./constants";

export function AIProvidersTab() {
  const queryClient = useQueryClient();

  const [aiKeys, setAiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyConfigured, setKeyConfigured] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showBackupKeys, setShowBackupKeys] = useState<Record<string, boolean>>({});
  const [deepTestResults, setDeepTestResults] = useState<Record<string, DeepTestResult>>({});
  const [bulkTesting, setBulkTesting] = useState(false);

  const [featureConfigs, setFeatureConfigs] = useState<Record<string, FeatureConfig>>({});
  const [modelCatalog, setModelCatalog] = useState<Record<string, string[]>>({});

  // Custom (user-added) providers
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newCustom, setNewCustom] = useState({ name: "", base_url: "", api_key: "", default_model: "" });
  const [newCustomModels, setNewCustomModels] = useState<string[]>([]);
  const [fetchingModelsFor, setFetchingModelsFor] = useState<string | null>(null);
  const [savingCustom, setSavingCustom] = useState(false);

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
    if (aiKeyData) {
      setKeyConfigured(aiKeyData.ai_keys_configured || {});
      if (aiKeyData.model_catalog) setModelCatalog(aiKeyData.model_catalog);
      if (aiKeyData.custom_ai_providers) setCustomProviders(aiKeyData.custom_ai_providers);
      if (aiKeyData.ai_provider_config) {
        const configs: Record<string, FeatureConfig> = {};
        for (const f of FEATURES) {
          configs[f.id] = parseFeatureConfig(aiKeyData.ai_provider_config[f.id]);
        }
        setFeatureConfigs(configs);
      }
    }
  }, [aiKeyData]);

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

  const saveCustomProviderMutation = useMutation({
    mutationFn: async (provider: { name: string; base_url: string; default_model?: string; models?: string[] }) => {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "save_custom_provider", provider },
      });
      if (error) throw error;
      return data;
    },
  });

  const deleteCustomProviderMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const { error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "delete_custom_provider", provider_id: providerId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ai-keys"] });
      toast.success("Đã xóa provider");
    },
    onError: () => toast.error("Lỗi khi xóa provider"),
  });

  // Fetch /models from a base_url (new, unsaved provider form)
  const fetchModelsForNew = async () => {
    if (!newCustom.base_url) {
      toast.error("Nhập Base URL trước");
      return;
    }
    setFetchingModelsFor("__new__");
    try {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "fetch_models", base_url: newCustom.base_url, test_key: newCustom.api_key },
      });
      if (error) throw error;
      if (data?.success) {
        setNewCustomModels(data.models || []);
        toast.success(`Lấy được ${data.models?.length || 0} model`);
      } else {
        toast.error(`Không lấy được model: ${data?.error?.slice(0, 150) || data?.status}`);
      }
    } catch {
      toast.error("Lỗi khi lấy danh sách model");
    } finally {
      setFetchingModelsFor(null);
    }
  };

  // Re-fetch /models for an already-saved custom provider (uses its saved key)
  const refetchModelsForSaved = async (providerId: string) => {
    setFetchingModelsFor(providerId);
    try {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "fetch_models", provider_id: providerId },
      });
      if (error) throw error;
      if (data?.success) {
        setCustomProviders(prev => prev.map(p => p.id === providerId ? { ...p, models: data.models || [] } : p));
        toast.success(`Lấy được ${data.models?.length || 0} model`);
      } else {
        toast.error(`Không lấy được model: ${data?.error?.slice(0, 150) || data?.status}`);
      }
    } catch {
      toast.error("Lỗi khi lấy danh sách model");
    } finally {
      setFetchingModelsFor(null);
    }
  };

  const addCustomProvider = async () => {
    if (!newCustom.name || !newCustom.base_url) {
      toast.error("Nhập tên và Base URL");
      return;
    }
    setSavingCustom(true);
    try {
      const result = await saveCustomProviderMutation.mutateAsync({
        name: newCustom.name,
        base_url: newCustom.base_url,
        default_model: newCustom.default_model || undefined,
        models: newCustomModels,
      });
      const savedProvider = result?.provider as CustomProvider;
      // Save the API key under the new provider's dynamic key field, if given
      if (newCustom.api_key && savedProvider) {
        await supabase.functions.invoke("manage-ai-keys", {
          body: { action: "save_keys", keys: { [`${savedProvider.id}_api_key`]: newCustom.api_key } },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-ai-keys"] });
      setNewCustom({ name: "", base_url: "", api_key: "", default_model: "" });
      setNewCustomModels([]);
      setShowAddCustom(false);
      toast.success("Đã thêm provider tùy chỉnh");
    } catch {
      toast.error("Lỗi khi thêm provider");
    } finally {
      setSavingCustom(false);
    }
  };

  const testConnection = async (providerId: string, keyFieldOverride?: string, customBaseUrl?: string) => {
    const keyField = keyFieldOverride || AI_PROVIDERS.find(p => p.id === providerId)?.keyField || `${providerId}_api_key`;
    const key = aiKeys[keyField] || "";
    if (!key || key.includes("...")) {
      toast.error("Nhập API key trước khi test");
      return;
    }
    setTestingProvider(providerId + (keyFieldOverride?.includes("_2") ? "_2" : ""));
    try {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "test", test_provider: providerId, test_key: key, custom_base_url: customBaseUrl },
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

  const deepTest = async (providerId: string, keyFieldOverride?: string, customBaseUrl?: string, testModel?: string) => {
    const keyField = keyFieldOverride || AI_PROVIDERS.find(p => p.id === providerId)?.keyField || `${providerId}_api_key`;
    const key = aiKeys[keyField] || "";
    if (!key || key.includes("...")) {
      toast.error("Nhập API key trước khi test");
      return;
    }
    const testId = providerId + (keyFieldOverride?.includes("_2") ? "_2" : "");
    setTestingProvider(testId);
    try {
      const { data, error } = await supabase.functions.invoke("manage-ai-keys", {
        body: { action: "deep_test", test_provider: providerId, test_key: key, custom_base_url: customBaseUrl, test_model: testModel },
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

  // Custom providers appear alongside built-in ones in every provider selector
  const allProviderOptions = [...PROVIDER_OPTIONS, ...customProviders.map(p => ({ id: p.id, name: `🔧 ${p.name}` }))];

  const getModelsForProvider = (provider: string) => {
    const custom = customProviders.find(p => p.id === provider);
    if (custom) return custom.models || [];
    return modelCatalog[provider] || [];
  };

  // Build provider overview data
  const providerOverview = allProviderOptions.map(p => {
    const featuresUsing = FEATURES.filter(f => (featureConfigs[f.id]?.provider || "lovable") === p.id);
    const isLovable = p.id === "lovable";
    const custom = customProviders.find(cp => cp.id === p.id);
    const keyField = custom ? `${custom.id}_api_key` : AI_PROVIDERS.find(ap => ap.id === p.id)?.keyField;
    const hasKey = isLovable || (keyField ? keyConfigured[keyField] : false);
    return { ...p, featuresUsing, hasKey, isLovable };
  }).filter(p => p.featuresUsing.length > 0 || p.hasKey);

  // Usage chart data
  const usageChartData = usageStats?.by_day
    ? Object.entries(usageStats.by_day as Record<string, number>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, count]) => ({ day: day.slice(5), calls: count }))
    : [];

  return (
    <div className="space-y-6">
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

      {/* Custom Providers Card — unlimited OpenAI-compatible providers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Custom Providers</CardTitle>
              <CardDescription>Thêm bất kỳ provider tương thích OpenAI API (base_url + api_key), tự động lấy danh sách model.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddCustom(v => !v)}>
              <Plus className="h-4 w-4 mr-1" /> Thêm Provider
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add-new form */}
          {showAddCustom && (
            <div className="p-3 rounded-lg border border-dashed border-primary/40 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Tên Provider</Label>
                  <Input
                    value={newCustom.name}
                    onChange={(e) => setNewCustom(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: TokenRouter"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Base URL</Label>
                  <Input
                    value={newCustom.base_url}
                    onChange={(e) => setNewCustom(prev => ({ ...prev, base_url: e.target.value }))}
                    placeholder="https://api.example.com/v1"
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">API Key</Label>
                  <Input
                    type="password"
                    value={newCustom.api_key}
                    onChange={(e) => setNewCustom(prev => ({ ...prev, api_key: e.target.value }))}
                    placeholder="sk-..."
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Model mặc định</Label>
                  {newCustomModels.length > 0 ? (
                    <Select value={newCustom.default_model || undefined} onValueChange={(v) => setNewCustom(prev => ({ ...prev, default_model: v }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Chọn model" /></SelectTrigger>
                      <SelectContent>
                        {newCustomModels.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={newCustom.default_model}
                      onChange={(e) => setNewCustom(prev => ({ ...prev, default_model: e.target.value }))}
                      placeholder="VD: z-ai/glm-5.3-free (hoặc bấm 'Lấy model')"
                      className="h-9 text-sm font-mono"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline" size="sm"
                  disabled={!newCustom.base_url || fetchingModelsFor === "__new__"}
                  onClick={fetchModelsForNew}
                >
                  {fetchingModelsFor === "__new__" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                  Lấy model
                </Button>
                {newCustomModels.length > 0 && (
                  <span className="text-xs text-muted-foreground">Tìm thấy {newCustomModels.length} model</span>
                )}
                <div className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => { setShowAddCustom(false); setNewCustom({ name: "", base_url: "", api_key: "", default_model: "" }); setNewCustomModels([]); }}>
                  Hủy
                </Button>
                <Button size="sm" onClick={addCustomProvider} disabled={savingCustom || !newCustom.name || !newCustom.base_url}>
                  {savingCustom ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Lưu Provider
                </Button>
              </div>
            </div>
          )}

          {/* Existing custom providers */}
          {customProviders.length === 0 && !showAddCustom ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Chưa có custom provider nào. Bấm "Thêm Provider" để thêm provider tương thích OpenAI API bất kỳ (TokenRouter, Groq, Together AI, vLLM tự host, v.v.)
            </div>
          ) : customProviders.map((provider) => {
            const keyField = `${provider.id}_api_key`;
            const testId = provider.id;
            const deepResult = deepTestResults[testId];
            return (
              <div key={provider.id} className="p-3 rounded-lg border border-border space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="font-medium">{provider.name}</Label>
                      {keyConfigured[keyField] ? (
                        <Badge variant="default" className="text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Configured</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs gap-1"><XCircle className="h-3 w-3" /> Chưa có key</Badge>
                      )}
                      <Badge variant="outline" className="text-xs font-mono">{provider.base_url}</Badge>
                    </div>
                    <div className="relative max-w-md">
                      <Input
                        type={showKeys[provider.id] ? "text" : "password"}
                        placeholder={keyConfigured[keyField] ? aiKeyData?.ai_keys_masked?.[keyField] || "••••••••" : "sk-..."}
                        value={aiKeys[keyField] || ""}
                        onChange={(e) => setAiKeys(prev => ({ ...prev, [keyField]: e.target.value }))}
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
                      disabled={!!testingProvider || !aiKeys[keyField]}
                      onClick={() => testConnection(provider.id, keyField, provider.base_url)}
                    >
                      {testingProvider === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      disabled={!!testingProvider || !aiKeys[keyField]}
                      onClick={() => deepTest(provider.id, keyField, provider.base_url, provider.default_model)}
                      title="Deep test: gửi prompt thực tế"
                    >
                      {testingProvider === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      disabled={fetchingModelsFor === provider.id}
                      onClick={() => refetchModelsForSaved(provider.id)}
                      title="Lấy lại danh sách model"
                    >
                      {fetchingModelsFor === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => { if (confirm(`Xóa provider ${provider.name}? (sẽ xóa cả key đã lưu)`)) deleteCustomProviderMutation.mutate(provider.id); }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {provider.models && provider.models.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {provider.models.length} model khả dụng · mặc định: <span className="font-mono">{provider.default_model || provider.models[0]}</span>
                  </div>
                )}
                {deepResult && (
                  <div className={`text-xs p-2 rounded border ${deepResult.success ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"}`}>
                    {deepResult.success ? (
                      <span>✅ Model: <strong>{deepResult.model}</strong> — Reply: "{deepResult.reply}" — {deepResult.duration_ms}ms</span>
                    ) : (
                      <span>❌ {deepResult.error?.slice(0, 150)}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
                        {allProviderOptions.map(p => (
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
    </div>
  );
}
