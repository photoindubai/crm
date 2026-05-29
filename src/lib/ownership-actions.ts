"use server";

import { requireActiveProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";
import { ENTITY_OWNERSHIP } from "@/lib/ownership.server";
import { isOwnerEntity, type OwnerEntity } from "@/lib/ownership";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type AdminClient = SupabaseClient<Database>;

async function applyOwner(
  admin: AdminClient,
  entity: OwnerEntity,
  recordId: string,
  ownerId: string | null,
): Promise<boolean> {
  switch (entity) {
    case "company": {
      const { error } = await admin.from("companies").update({ owner_id: ownerId }).eq("id", recordId);
      return !error;
    }
    case "contact": {
      const { error } = await admin.from("contacts").update({ owner_id: ownerId }).eq("id", recordId);
      return !error;
    }
    case "brand": {
      const { error } = await admin.from("brands").update({ owner_id: ownerId }).eq("id", recordId);
      return !error;
    }
    case "participation": {
      const { error } = await admin
        .from("participations")
        .update({ sales_owner_id: ownerId })
        .eq("id", recordId);
      return !error;
    }
    case "action": {
      const { error } = await admin.from("actions").update({ assigned_to: ownerId }).eq("id", recordId);
      return !error;
    }
    default:
      return false;
  }
}

/**
 * Sets (or clears) the owner of a record. Guarded:
 * - only allowlisted entities/columns can be written;
 * - the record and the target owner must belong to the caller's organization;
 * - `owner_id` of "me" assigns to the caller, "" unassigns.
 */
export async function setRecordOwner(formData: FormData): Promise<void> {
  const { user, profile } = await requireActiveProfile();
  const orgId = profile.organization_id ?? process.env.DEFAULT_ORGANIZATION_ID ?? null;
  if (!orgId) {
    return;
  }

  const entity = String(formData.get("entity") ?? "");
  const recordId = String(formData.get("record_id") ?? "");
  const rawOwner = String(formData.get("owner_id") ?? "");

  if (!isOwnerEntity(entity) || !recordId) {
    return;
  }

  const config = ENTITY_OWNERSHIP[entity];
  const ownerId = rawOwner === "me" ? user.id : rawOwner || null;

  const admin = createSupabaseAdminClient();

  const { data: record } = await admin
    .from(config.table)
    .select("id,organization_id")
    .eq("id", recordId)
    .maybeSingle();

  if (!record || record.organization_id !== orgId) {
    return;
  }

  if (ownerId) {
    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("id,organization_id")
      .eq("id", ownerId)
      .maybeSingle();

    if (!ownerProfile || ownerProfile.organization_id !== orgId) {
      return;
    }
  }

  const ok = await applyOwner(admin, entity, recordId, ownerId);
  if (!ok) {
    return;
  }

  config.invalidate(orgId, recordId);
  await logActivity({
    organizationId: orgId,
    actorId: user.id,
    entityType: entity,
    entityId: recordId,
    action: "owner_changed",
    metadata: { owner_id: ownerId },
  });
}
