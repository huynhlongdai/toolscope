import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LaunchSubscribeButtonProps {
  launchId: string;
  subscriberCount?: number;
  size?: "sm" | "default";
  className?: string;
}

export function LaunchSubscribeButton({ launchId, subscriberCount = 0, size = "sm", className }: LaunchSubscribeButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: isSubscribed } = useQuery({
    queryKey: ["launch-sub", launchId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("launch_subscribers")
        .select("id")
        .eq("launch_id", launchId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const toggle = async () => {
    if (!user) { toast.error("Vui lòng đăng nhập"); return; }
    setLoading(true);
    try {
      if (isSubscribed) {
        await supabase.from("launch_subscribers").delete().eq("launch_id", launchId).eq("user_id", user.id);
        await supabase.from("launches").update({ subscriber_count: Math.max(0, subscriberCount - 1) }).eq("id", launchId);
      } else {
        await supabase.from("launch_subscribers").insert({ launch_id: launchId, user_id: user.id });
        await supabase.from("launches").update({ subscriber_count: subscriberCount + 1 }).eq("id", launchId);
      }
      queryClient.invalidateQueries({ queryKey: ["launch-sub", launchId] });
      queryClient.invalidateQueries({ queryKey: ["launches"] });
      toast.success(isSubscribed ? "Đã hủy theo dõi" : "🔔 Sẽ thông báo khi ra mắt!");
    } catch {
      toast.error("Có lỗi xảy ra");
    }
    setLoading(false);
  };

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      size={size}
      onClick={(e) => { e.stopPropagation(); toggle(); }}
      disabled={loading}
      className={cn("gap-1.5", className)}
    >
      {isSubscribed ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
      {isSubscribed ? "Đã theo dõi" : "Nhận thông báo"}
      {subscriberCount > 0 && <span className="text-xs opacity-70">({subscriberCount})</span>}
    </Button>
  );
}
