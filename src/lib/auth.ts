import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { PROFILE_STATUS, SUPER_ADMIN_ROLE } from "@/lib/roles";
import type { ProfileStatus } from "@/lib/roles";
import { profileDisplayName } from "@/lib/profile-display";

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
  | "id"
  | "full_name"
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "position"
  | "role"
  | "status"
  | "organization_id"
>;

type CurrentProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "full_name"
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "position"
  | "role"
  | "status"
  | "organization_id"
>;

type CurrentUserContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User | null;
  profile: CurrentProfileRow | null;
};

/**
 * Per-request memoized auth context.
 *
 * `auth.getUser()` is a network round-trip to the Supabase Auth server, and the profile read is a
 * DB round-trip. Several places in a single render need them (page guard + AppShell badge + nav),
 * so React `cache()` collapses them to a single getUser() + single profile query per request.
 */
const loadCurrentUserContext = cache(async (): Promise<CurrentUserContext> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id,full_name,first_name,last_name,email,phone,position,role,status,organization_id")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile: (data as CurrentProfileRow | null) ?? null };
});

/**
 * Strict gate for protected CRM pages and actions: requires an authenticated user with an
 * `active` profile. Invited/disabled/null are always blocked here. Invited users only become
 * active at auth entry points (see `resolveEntryProfile`).
 */
export async function requireActiveProfile() {
  const { supabase, user, profile } = await loadCurrentUserContext();

  if (!user) {
    redirect("/login");
  }

  if (!profile || profile.status !== PROFILE_STATUS.active) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return {
    user,
    profile: profile as ActiveProfile,
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

export type ProfileSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  displayName: string;
  email: string | null;
  role: string;
};

/**
 * Best-effort read of the current user's profile for UI purposes (e.g. conditional nav, the
 * signed-in account indicator). Never redirects or signs out; returns null when there is no active
 * session/profile. Authorization is always enforced server-side via
 * `requireActiveProfile` / `requireSuperAdmin`.
 */
export async function getCurrentProfileSummary(): Promise<ProfileSummary | null> {
  const { user, profile } = await loadCurrentUserContext();

  if (!user || !profile || profile.status !== PROFILE_STATUS.active) {
    return null;
  }

  return {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    fullName: profile.full_name,
    displayName: profileDisplayName(profile),
    email: profile.email ?? user.email ?? null,
    role: profile.role,
  };
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
