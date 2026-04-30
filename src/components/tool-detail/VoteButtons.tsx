import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface VoteButtonsProps {
  targetId: string;
  targetType: "review" | "comment" | "question" | "answer";
  upvotes: number;
  downvotes: number;
  userId?: string;
}

export function VoteButtons({ targetId, targetType, upvotes, downvotes, userId }: VoteButtonsProps) {
  const queryClient = useQueryClient();

  const { data: userVote } = useQuery({
    queryKey: ["vote", targetId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("votes")
        .select("vote")
        .eq("target_id", targetId)
        .eq("target_type", targetType)
        .eq("user_id", userId!)
        .maybeSingle();
      return data?.vote as "up" | "down" | null;
    },
    enabled: !!userId,
  });

  const handleVote = async (vote: "up" | "down") => {
    if (!userId) { toast.error("Vui lòng đăng nhập"); return; }

    if (userVote === vote) {
      await supabase.from("votes").delete().eq("target_id", targetId).eq("target_type", targetType).eq("user_id", userId);
    } else if (userVote) {
      await supabase.from("votes").update({ vote }).eq("target_id", targetId).eq("target_type", targetType).eq("user_id", userId);
    } else {
      await supabase.from("votes").insert({ target_id: targetId, target_type: targetType, user_id: userId, vote });
    }
    queryClient.invalidateQueries({ queryKey: ["vote", targetId, userId] });
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={() => handleVote("up")}
        className={`flex items-center gap-1 text-xs transition-colors ${userVote === "up" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
      >
        <ThumbsUp className="h-3.5 w-3.5" /> {upvotes}
      </button>
      <button
        onClick={() => handleVote("down")}
        className={`flex items-center gap-1 text-xs transition-colors ${userVote === "down" ? "text-destructive font-medium" : "text-muted-foreground hover:text-foreground"}`}
      >
        <ThumbsDown className="h-3.5 w-3.5" /> {downvotes}
      </button>
    </div>
  );
}
