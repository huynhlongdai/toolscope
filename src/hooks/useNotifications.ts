import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const TYPE_TO_PREF: Record<string, string> = {
  deal: "notify_deals",
  new_tool: "notify_new_tools",
  review: "notify_reviews",
  comment: "notify_comments",
  follow: "notify_follows",
  launch: "notify_launches",
  system: "notify_system",
};

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notification_preferences" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as Record<string, any> | null;
    },
    enabled: !!user?.id,
  });

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  // Filter notifications by user preferences
  const filteredNotifications = notifications?.filter((n: any) => {
    if (!preferences) return true; // No prefs = show all
    const prefKey = TYPE_TO_PREF[n.type];
    if (!prefKey) return true;
    return preferences[prefKey] !== false;
  }) || [];

  const unreadCount = filteredNotifications.filter((n: any) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications" as any).update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await supabase
        .from("notifications" as any)
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  return { notifications: notifications || [], unreadCount, isLoading, markAsRead: markAsRead.mutate, markAllAsRead: markAllAsRead.mutate };
}
