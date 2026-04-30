import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function useFollow(targetType: "tool" | "user" | "category", targetId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["follow", targetType, targetId, user?.id];

  const { data: isFollowing } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows" as any)
        .select("id")
        .eq("user_id", user!.id)
        .eq("target_type", targetType)
        .eq("target_id", targetId!)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id && !!targetId,
  });

  const { data: followerCount } = useQuery({
    queryKey: ["follower-count", targetType, targetId],
    queryFn: async () => {
      const { count } = await supabase
        .from("follows" as any)
        .select("id", { count: "exact", head: true })
        .eq("target_type", targetType)
        .eq("target_id", targetId!);
      return count || 0;
    },
    enabled: !!targetId,
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Chưa đăng nhập");
      if (isFollowing) {
        await supabase
          .from("follows" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("target_type", targetType)
          .eq("target_id", targetId!);
      } else {
        await supabase
          .from("follows" as any)
          .insert({ user_id: user.id, target_type: targetType, target_id: targetId! });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["follower-count", targetType, targetId] });
      toast.success(isFollowing ? "Đã bỏ theo dõi" : "Đang theo dõi!");
    },
    onError: () => {
      toast.error("Vui lòng đăng nhập");
    },
  });

  return { isFollowing: !!isFollowing, followerCount: followerCount || 0, toggleFollow: toggleFollow.mutate };
}
