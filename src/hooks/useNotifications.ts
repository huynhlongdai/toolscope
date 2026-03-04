import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

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
