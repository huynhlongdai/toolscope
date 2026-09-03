import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

interface RoleResult {
  isAdmin: boolean;
  isEditor: boolean;
}

/**
 * Fetches the current user's roles from `user_roles`, cached via React Query
 * (queryKey scoped per user id). Previously this used plain useState/useEffect
 * and re-fetched on every mount with no caching, which combined with the
 * duplicate call in both AdminGuard and AdminLayout meant every admin page
 * load triggered the query twice. React Query now dedupes concurrent
 * identical queries and caches the result for `staleTime`, so navigating
 * between admin pages doesn't refetch roles every time.
 */
export function useAdminAuth() {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-roles", user?.id],
    queryFn: async (): Promise<RoleResult> => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      const roles = data?.map((r) => r.role) ?? [];
      return { isAdmin: roles.includes("admin"), isEditor: roles.includes("editor") };
    },
    enabled: !authLoading && !!user,
    staleTime: 60_000,
  });

  const loading = authLoading || (!!user && isLoading);
  const isAdmin = data?.isAdmin ?? false;
  const isEditor = data?.isEditor ?? false;

  return { isAdmin, isEditor, isAdminOrEditor: isAdmin || isEditor, loading, user };
}
