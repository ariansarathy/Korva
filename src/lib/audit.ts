import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";

export type AuditAction =
  | "ai_query"
  | "team_invite"
  | "team_remove"
  | "data_export"
  | "api_key_create"
  | "api_key_revoke"
  | "store_switch"
  | "store_connect"
  | "store_disconnect"
  | "report_generate"
  | "settings_update"
  | "webhook_create"
  | "webhook_update"
  | "webhook_delete";

/**
 * Log an audit event. Fire-and-forget — does not block the response.
 * Uses the admin client to bypass RLS for inserts.
 */
export function logAudit(
  userId: string,
  storeId: string | null,
  action: AuditAction,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
  request?: Request
): void {
  const ipAddress = request
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
    : null;

  // Wrap in async IIFE to handle both PromiseLike and Promise
  (async () => {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from("audit_log")
        .insert({
          user_id: userId,
          store_id: storeId,
          action,
          entity_type: entityType ?? null,
          entity_id: entityId ?? null,
          metadata: metadata ?? {},
          ip_address: ipAddress,
        });

      if (error) {
        logger.warn("Audit log insert failed", { error, action, userId });
      }
    } catch (err) {
      logger.warn("Audit log unexpected error", { error: err, action, userId });
    }
  })();
}
