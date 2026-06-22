import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ToolGridSkeletonProps {
  count?: number;
  viewMode?: "grid" | "list";
  className?: string;
}

export function ToolGridSkeleton({ count = 9, viewMode = "grid", className }: ToolGridSkeletonProps) {
  return (
    <div className={cn(
      viewMode === "grid"
        ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        : "flex flex-col gap-2",
      className
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl border bg-card p-4",
            viewMode === "list" ? "flex items-center gap-4" : ""
          )}
        >
          <div className={cn("flex items-start gap-3", viewMode === "list" ? "flex-1" : "")}>
            {/* Logo skeleton */}
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              {/* Name */}
              <Skeleton className="h-4 w-32" />
              {/* Description */}
              <Skeleton className="h-3 w-full max-w-[200px]" />
              {viewMode === "grid" && <Skeleton className="h-3 w-3/4" />}
              {/* Tags row */}
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          </div>
          {viewMode === "grid" && (
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-14" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
