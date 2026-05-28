import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { PROFILE_STATUS, SUPER_ADMIN_ROLE } from "@/lib/roles";
import type { ProfileStatus } from "@/lib/roles";

export {
  PROFILE_STATUS,
  SUPER_ADMIN_ROLE,
  CRM_ROLES,
  isAssignableRole,
  isKnownRole,
} from "@/lib/roles";
export type { ProfileStatus, ProfileRole } from "@/lib/roles";

export type ActiveProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "role" | "status" | "organization_id"
>;

/**
 * Strict gate for protected CRM pages and actions: requires an authenticated user with an
 * `active` profile. Invited/disabled/null are always blocked here. Invited users only become
 * active at auth entry points (see `resolveEntryProfile`).
 */
export async function requireActiveProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const admin = createSupabaseAdminClient();
  const { data, error: profileError } = await admin
    .from("profiles")
    .select("id,full_name,role,status,organization_id")
    .eq("id", user.id)
    .single();

  if (profileError || !data || data.status !== PROFILE_STATUS.active) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return {
    user,
    profile: data as ActiveProfile,
  };
}

/**
 * Stricter gate for super-admin-only areas (e.g. /settings/users). Builds on
 * `requireActiveProfile` and redirects non-super-admins away. Real protection lives here on the
 * server; nav visibility is only cosmetic.
 */
export async function requireSuperAdmin() {
  const auth = await requireActiveProfile();

  if (auth.profile.role !== SUPER_ADMIN_ROLE) {
    redirect("/dashboard");
  }

  return auth;
}

/**
 * Best-effort read of the current user's role for UI purposes (e.g. conditional nav). Never
 * redirects or signs out; returns null when there is no active session/profile. Authorization is
 * always enforced server-side via `requireActiveProfile` / `requireSuperAdmin`.
 */
export async function getCurrentProfileRole(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role,status")
    .eq("id", user.id)
    .maybeSingle();

  if (!data || data.status !== PROFILE_STATUS.active) {
    return null;
  }

  return data.role;
}

type EntryResolution =
  | { ok: true; status: ProfileStatus }
  | { ok: false; reason: "missing" | "disabled" };

/**
 * Resolves a profile at an auth ENTRY point (login / OAuth + magic-link callback) only.
 *
 * - active:   allowed.
 * - invited:  immediately upgraded to active, then allowed (invite acceptance / first login).
 * - disabled: rejected.
 * - missing/null/other: rejected.
 *
 * This is the single place where `invited` is allowed to proceed. Protected pages still use the
 * strict `requireActiveProfile`.
 */
export async function resolveEntryProfile(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<EntryResolution> {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id,status")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return { ok: false, reason: "missing" };
  }

  if (profile.status === PROFILE_STATUS.disabled) {
    return { ok: false, reason: "disabled" };
  }

  if (profile.status === PROFILE_STATUS.invited) {
    const { error: upgradeError } = await admin
      .from("profiles")
      .update({ status: PROFILE_STATUS.active })
      .eq("id", userId);

    if (upgradeError) {
      return { ok: false, reason: "missing" };
    }

    return { ok: true, status: PROFILE_STATUS.active };
  }

  if (profile.status === PROFILE_STATUS.active) {
    return { ok: true, status: PROFILE_STATUS.active };
  }

  // Unknown/null status is treated as blocked.
  return { ok: false, reason: "disabled" };
}

export function getSafeNextPath(value: FormDataEntryValue | string | null | undefined) {
  const next = String(value ?? "/dashboard");

  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) {
    return "/dashboard";
  }

  return next;
}
