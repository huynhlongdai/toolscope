import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Tag, Wrench, Star, MessageSquare, Users, Rocket, Settings } from "lucide-react";
import { toast } from "sonner";

const PREF_ITEMS = [
  { key: "notify_deals", label: "Ưu đãi & Deals", desc: "Thông báo khi có deal mới cho tools bạn theo dõi", icon: Tag },
  { key: "notify_new_tools", label: "Tools mới", desc: "Thông báo khi có tool mới trong danh mục bạn quan tâm", icon: Wrench },
  { key: "notify_reviews", label: "Đánh giá", desc: "Thông báo khi có review mới trên tools của bạn", icon: Star },
  { key: "notify_comments", label: "Bình luận", desc: "Thông báo khi có ai reply bình luận của bạn", icon: MessageSquare },
  { key: "notify_follows", label: "Theo dõi", desc: "Thông báo khi có người theo dõi bạn", icon: Users },
  { key: "notify_launches", label: "Ra mắt sản phẩm", desc: "Thông báo khi sản phẩm bạn đăng ký theo dõi ra mắt", icon: Rocket },
  { key: "notify_system", label: "Hệ thống", desc: "Thông báo quan trọng từ hệ thống", icon: Settings },
] as const;

type PrefKey = typeof PREF_ITEMS[number]["key"];

export function NotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, any> | null;
    },
    enabled: !!user?.id,
  });

  const updatePref = useMutation({
    mutationFn: async ({ key, value }: { key: PrefKey; value: boolean }) => {
      if (!user?.id) return;
      if (prefs) {
        const { error } = await supabase
          .from("notification_preferences" as any)
          .update({ [key]: value } as any)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences" as any)
          .insert({ user_id: user.id, [key]: value } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
    onError: () => toast.error("Không thể cập nhật cài đặt"),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5 text-primary" />
          Cài đặt thông báo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {PREF_ITEMS.map(({ key, label, desc, icon: Icon }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium cursor-pointer">{label}</Label>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
            <Switch
              checked={prefs?.[key] ?? true}
              onCheckedChange={(value) => updatePref.mutate({ key, value })}
              disabled={updatePref.isPending}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
