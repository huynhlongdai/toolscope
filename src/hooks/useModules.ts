import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: "content" | "community" | "marketing" | "system";
  defaultEnabled: boolean;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  // Content
  { id: "blog", label: "Blog", description: "Quản lý và xuất bản bài viết blog", icon: "📝", category: "content", defaultEnabled: true },
  { id: "workflows", label: "Workflows", description: "Hướng dẫn quy trình làm việc với AI tools", icon: "🔄", category: "content", defaultEnabled: true },
  { id: "deals", label: "Deals & Coupons", description: "Mã giảm giá và ưu đãi cho các công cụ", icon: "🏷️", category: "content", defaultEnabled: true },
  { id: "launches", label: "Launches", description: "Sản phẩm mới ra mắt (Product Hunt style)", icon: "🚀", category: "content", defaultEnabled: false },
  { id: "tasks", label: "Tasks", description: "Phân loại công cụ theo nhiệm vụ cụ thể", icon: "✅", category: "content", defaultEnabled: false },
  { id: "collections", label: "Collections", description: "Bộ sưu tập công cụ do người dùng tạo", icon: "📂", category: "content", defaultEnabled: true },
  { id: "compare", label: "So sánh", description: "So sánh song song giữa các công cụ", icon: "⚖️", category: "content", defaultEnabled: true },

  // Community
  { id: "reviews", label: "Reviews", description: "Đánh giá công cụ từ người dùng", icon: "⭐", category: "community", defaultEnabled: true },
  { id: "comments", label: "Comments", description: "Bình luận trong trang chi tiết công cụ", icon: "💬", category: "community", defaultEnabled: true },
  { id: "qa", label: "Q&A", description: "Hỏi đáp về công cụ", icon: "❓", category: "community", defaultEnabled: false },
  { id: "leaderboard", label: "Leaderboard", description: "Bảng xếp hạng người đóng góp", icon: "🏆", category: "community", defaultEnabled: false },

  // Marketing
  { id: "newsletter", label: "Newsletter", description: "Thu thập email và gửi bản tin", icon: "📧", category: "marketing", defaultEnabled: true },
  { id: "ai_chat", label: "AI Chat Widget", description: "Chatbot AI hỗ trợ người dùng", icon: "🤖", category: "marketing", defaultEnabled: true },
  { id: "submit_tool", label: "Submit Tool", description: "Cho phép người dùng gửi công cụ mới", icon: "📤", category: "marketing", defaultEnabled: true },

  // System
  { id: "translations", label: "Đa ngôn ngữ", description: "Dịch nội dung sang nhiều ngôn ngữ", icon: "🌐", category: "system", defaultEnabled: true },
  { id: "collect_ai", label: "CollectAI", description: "Thu thập dữ liệu công cụ tự động bằng AI", icon: "🧠", category: "system", defaultEnabled: true },
  { id: "analytics", label: "Analytics", description: "Phân tích lượt truy cập và hành vi", icon: "📊", category: "system", defaultEnabled: false },
];

export const MODULE_CATEGORIES: Record<string, string> = {
  content: "Nội dung",
  community: "Cộng đồng",
  marketing: "Marketing",
  system: "Hệ thống",
};

type ModulesConfig = Record<string, boolean>;

export function useModules() {
  const queryClient = useQueryClient();

  const { data: modulesConfig, isLoading } = useQuery({
    queryKey: ["modules-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "modules_config")
        .maybeSingle();
      return (data?.value as ModulesConfig | null) ?? null;
    },
  });

  const getEnabled = (moduleId: string): boolean => {
    if (modulesConfig && moduleId in modulesConfig) return modulesConfig[moduleId];
    const def = MODULE_DEFINITIONS.find((m) => m.id === moduleId);
    return def?.defaultEnabled ?? false;
  };

  const isEnabled = (moduleId: string) => getEnabled(moduleId);

  const saveMutation = useMutation({
    mutationFn: async (config: ModulesConfig) => {
      await supabase.from("site_settings").upsert(
        { key: "modules_config", value: config as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules-config"] });
    },
  });

  const currentConfig = (): ModulesConfig => {
    const config: ModulesConfig = {};
    MODULE_DEFINITIONS.forEach((m) => {
      config[m.id] = getEnabled(m.id);
    });
    return config;
  };

  return { isEnabled, isLoading, modulesConfig: currentConfig(), saveMutation };
}
