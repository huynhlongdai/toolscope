import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export function useAdminAuth() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      setIsEditor(false);
      setLoading(false);
      return;
    }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const roles = data?.map((r) => r.role) ?? [];
        setIsAdmin(roles.includes("admin"));
        setIsEditor(roles.includes("editor"));
        setLoading(false);
      });
  }, [user, authLoading]);

  return { isAdmin, isEditor, isAdminOrEditor: isAdmin || isEditor, loading, user };
}
