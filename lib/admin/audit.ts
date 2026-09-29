import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { AppAuditAction } from "./audit-labels";

type AuditEntry = {
  action: AppAuditAction;
  targetType?: string;
  targetId?: string;
  details?: Record<string, Json>;
};

/** Records a change the app made directly. It happens after the change and is best effort: a
 *  failure is logged and never fails or undoes what the admin did. Use the admin's own
 *  client, since the database takes the actor from the session. */
export async function writeAudit(
  supabase: SupabaseClient<Database>,
  entry: AuditEntry,
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("admin_write_audit", {
      p_action: entry.action,
      p_target_type: entry.targetType,
      p_target_id: entry.targetId,
      p_details: entry.details ?? {},
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Couldn't write the audit row for ${entry.action}:`, err);
    return false;
  }
}
