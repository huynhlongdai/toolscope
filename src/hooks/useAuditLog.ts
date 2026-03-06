import { supabase } from "@/integrations/supabase/client";

export async function logAuditAction(
  action: string,
  entityType?: string,
  entityId?: string,
  details?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      user_id: user?.id || null,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: details || {},
    });
  } catch (e) {
    console.error("Failed to log audit action:", e);
  }
}

export function useAuditLog() {
  return { log: logAuditAction };
}
