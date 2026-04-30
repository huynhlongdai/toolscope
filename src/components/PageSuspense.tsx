import { Suspense, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface PageSuspenseProps {
  children: ReactNode;
}

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </div>
    </div>
  );
}

export function PageSuspense({ children }: PageSuspenseProps) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}
