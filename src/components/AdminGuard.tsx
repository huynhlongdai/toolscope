import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2 } from "lucide-react";

interface AdminGuardProps {
  children: ReactNode;
  /**
   * When true, editors are also denied (redirected to /admin) - only
   * admins may pass. Use for sensitive routes: Settings, Users, Backup,
   * Audit Logs, Sync. Defaults to false (admin OR editor allowed), which
   * is the existing behavior for regular content-management routes.
   */
  adminOnly?: boolean;
}

export function AdminGuard({ children, adminOnly = false }: AdminGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isAdminOrEditor, loading: adminLoading } = useAdminAuth();

  if (authLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdminOrEditor) {
    return <Navigate to="/" replace />;
  }

  // Editor is logged in and has baseline admin-area access, but this
  // route is restricted to admins only (e.g. Settings/Users/Backup/
  // Audit Logs/Sync) - send them back to the admin dashboard instead.
  if (adminOnly && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
