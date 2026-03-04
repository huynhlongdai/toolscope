import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UpvoteButtonProps {
  targetId: string;
  targetType: "workflow" | "tool" | "collection";
  currentUpvotes: number;
  tableName: "workflows" | "tools" | "collections";
  className?: string;
}

export function UpvoteButton({ targetId, targetType, currentUpvotes, tableName, className }: UpvoteButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const { data: hasVoted } = useQuery({
    queryKey: ["upvote", targetType, targetId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("votes")
        .select("id")
        .eq("target_id", targetId)
        .eq("target_type", targetType)
        .eq("user_id", user!.id)
        .eq("vote", "up")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const voted = optimistic ?? hasVoted ?? false;

  const handleUpvote = async () => {
    if (!user) { toast.error("Vui lòng đăng nhập để vote"); return; }

    const newVoted = !voted;
    setOptimistic(newVoted);

    try {
      if (newVoted) {
        await supabase.from("votes").insert({ target_id: targetId, target_type: targetType, user_id: user.id, vote: "up" as const });
        await supabase.from(tableName).update({ upvotes: currentUpvotes + 1 } as any).eq("id", targetId);
      } else {
        await supabase.from("votes").delete().eq("target_id", targetId).eq("target_type", targetType).eq("user_id", user.id);
        await supabase.from(tableName).update({ upvotes: Math.max(0, currentUpvotes - 1) } as any).eq("id", targetId);
      }
      queryClient.invalidateQueries({ queryKey: ["upvote", targetType, targetId] });
      queryClient.invalidateQueries({ queryKey: [targetType] });
      queryClient.invalidateQueries({ queryKey: ["workflow"] });
    } catch {
      setOptimistic(null);
      toast.error("Lỗi khi vote");
    }
  };

  return (
    <Button
      variant={voted ? "default" : "outline"}
      size="sm"
      onClick={handleUpvote}
      className={cn("gap-1.5", className)}
    >
      <ThumbsUp className={cn("h-4 w-4", voted && "fill-current")} />
      {currentUpvotes + (optimistic === true && !hasVoted ? 1 : optimistic === false && hasVoted ? -1 : 0)}
    </Button>
  );
}
