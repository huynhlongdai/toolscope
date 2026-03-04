import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFollow } from "@/hooks/useFollow";

interface Props {
  targetType: "tool" | "user" | "category";
  targetId: string;
  showCount?: boolean;
}

export function FollowButton({ targetType, targetId, showCount = false }: Props) {
  const { isFollowing, followerCount, toggleFollow } = useFollow(targetType, targetId);

  const label = isFollowing ? "Đang theo dõi" : "Theo dõi";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isFollowing ? "secondary" : "outline"}
          size="icon"
          onClick={() => toggleFollow()}
        >
          {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}{showCount && followerCount > 0 ? ` (${followerCount})` : ""}</p>
      </TooltipContent>
    </Tooltip>
  );
}
