import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  invalidateActions,
  invalidateBrand,
  invalidateCompany,
  invalidateContact,
  invalidateParticipation,
} from "@/lib/cache/invalidate";
import { cacheTags } from "@/lib/cache-tags";
import { CACHE_TTL } from "@/lib/cache/ttl";
import { loadCached } from "@/lib/server-cache";
import type { OrgUser, OwnerEntity } from "@/lib/ownership";

export type OwnershipTable = "companies" | "contacts" | "brands" | "participations" | "actions";
export type OwnerColumn = "owner_id" | "sales_owner_id" | "assigned_to";

type EntityConfig = {
  table: OwnershipTable;
  ownerColumn: OwnerColumn;
  invalidate: (orgId: string, recordId: string) => void;
};

/** Allowlist of entities whose ownership can be changed, mapped to their table + owner column. */
export const ENTITY_OWNERSHIP: Record<OwnerEntity, EntityConfig> = {
  company: {
    table: "companies",
    ownerColumn: "owner_id",
    invalidate: (orgId, recordId) => invalidateCompany(orgId, recordId),
  },
  contact: {
    table: "contacts",
    ownerColumn: "owner_id",
    invalidate: (orgId, recordId) => invalidateContact(orgId, recordId),
  },
  brand: {
    table: "brands",
    ownerColumn: "owner_id",
    invalidate: (orgId, recordId) => invalidateBrand(orgId, recordId),
  },
  participation: {
    table: "participations",
    ownerColumn: "sales_owner_id",
    invalidate: (orgId, recordId) => invalidateParticipation(orgId, null, recordId),
  },
  action: {
    table: "actions",
    ownerColumn: "assigned_to",
    invalidate: (orgId) => invalidateActions(orgId),
  },
};

/**
 * Loads all profiles in an organization (including disabled, so existing owners always resolve to a
 * name). The OwnerCell dropdown disables non-active users for new assignments.
 *
 * Cached per org and rendered on every list page; invalidated via `orgProfiles` when users are
 * invited/updated/disabled (see settings/users/actions.ts).
 */
export async function getOrgUsers(orgId: string): Promise<OrgUser[]> {
  if (!orgId) {
    return [];
  }

  return loadCached(
    {
      keyParts: ["org-users", orgId],
      tags: [cacheTags.orgProfiles(orgId)],
      revalidateSeconds: CACHE_TTL.LIST_LONG,
    },
    async () => {
      const admin = createSupabaseAdminClient();
      const { data } = await admin
        .from("profiles")
        .select("id,full_name,email,status")
        .eq("organization_id", orgId)
        .order("full_name", { ascending: true, nullsFirst: false });

      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.full_name ?? "",
        email: row.email,
        disabled: row.status === "disabled",
      }));
    },
  );
}

export function orgUsersById(users: OrgUser[]): Map<string, OrgUser> {
  return new Map(users.map((user) => [user.id, user]));
}
