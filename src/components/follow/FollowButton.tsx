import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFollow } from "@/hooks/useFollow";

interface Props {
  targetType: "tool" | "user" | "category";
  targetId: string;
  size?: "sm" | "default" | "icon";
  showCount?: boolean;
}

export function FollowButton({ targetType, targetId, size = "sm", showCount = false }: Props) {
  const { isFollowing, followerCount, toggleFollow } = useFollow(targetType, targetId);

  return (
    <Button
      variant={isFollowing ? "secondary" : "outline"}
      size={size}
      className="gap-1.5"
      onClick={() => toggleFollow()}
    >
      {isFollowing ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      {isFollowing ? "Đang theo dõi" : "Theo dõi"}
      {showCount && followerCount > 0 && (
        <span className="text-muted-foreground">({followerCount})</span>
      )}
    </Button>
  );
}
