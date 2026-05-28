import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type ActivityLogInsert = Database["public"]["Tables"]["activity_log"]["Insert"];

export type LogActivityInput = {
  organizationId: string | null;
  actorId: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  metadata?: Record<string, unknown> | null;
};

/**
 * Writes an audit row to `public.activity_log` using the service-role client.
 *
 * Logging must never break the operation it accompanies, so all errors are swallowed (and logged
 * to the server console). Callers should treat this as fire-and-forget.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const row: ActivityLogInsert = {
      organization_id: input.organizationId,
      actor_id: input.actorId,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      action: input.action,
      metadata: (input.metadata ?? null) as ActivityLogInsert["metadata"],
    };

    const { error } = await admin.from("activity_log").insert(row);
    if (error) {
      console.error("[activity-log] insert failed:", error.message);
    }
  } catch (error) {
    console.error("[activity-log] unexpected error:", error);
  }
}
