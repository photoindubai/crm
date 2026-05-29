"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROFILE_STATUS,
  SUPER_ADMIN_ROLE,
  isAssignableRole,
  requireSuperAdmin,
} from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { cacheTags } from "@/lib/cache-tags";
import { invalidateCacheTags } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export type InviteState = {
  error?: string;
  message?: string;
};

const USERS_PATH = "/settings/users";

type AdminClient = SupabaseClient<Database>;

function resolveOrgId(organizationId: string | null): string | null {
  return organizationId ?? process.env.DEFAULT_ORGANIZATION_ID ?? null;
}

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function inviteRedirectUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL("/auth/callback?next=/dashboard", base).toString();
}

function isAlreadyRegisteredError(message: string | undefined): boolean {
  const text = (message ?? "").toLowerCase();
  return text.includes("already") || text.includes("registered") || text.includes("exists");
}

async function findAuthUserIdByEmail(admin: AdminClient, email: string): Promise<string | null> {
  const perPage = 200;
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      return null;
    }
    const match = data.users.find((candidate) => (candidate.email ?? "").toLowerCase() === email);
    if (match) {
      return match.id;
    }
    if (data.users.length < perPage) {
      break;
    }
  }
  return null;
}

async function countActiveSuperAdmins(admin: AdminClient, orgId: string): Promise<number> {
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("role", SUPER_ADMIN_ROLE)
    .eq("status", PROFILE_STATUS.active);
  return count ?? 0;
}

type TargetProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "email" | "first_name" | "last_name" | "full_name" | "role" | "status" | "organization_id"
>;

async function loadTargetInOrg(
  admin: AdminClient,
  userId: string,
  orgId: string,
): Promise<TargetProfile | null> {
  const { data } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,full_name,role,status,organization_id")
    .eq("id", userId)
    .maybeSingle();

  if (!data || data.organization_id !== orgId) {
    return null;
  }

  return data as TargetProfile;
}

export async function inviteUser(_state: InviteState, formData: FormData): Promise<InviteState> {
  const { user, profile } = await requireSuperAdmin();
  const orgId = resolveOrgId(profile.organization_id);

  if (!orgId) {
    return { error: "No organization is configured for your account." };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const role = String(formData.get("role") ?? "");

  if (!email || !isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }
  if (!isAssignableRole(role)) {
    return { error: "Select a valid role." };
  }

  const admin = createSupabaseAdminClient();

  // A profile is 1:1 with an auth user, so email uniquely identifies an existing CRM user.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id,organization_id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    return {
      error: "A CRM profile already exists for this email. Edit the existing user instead.",
    };
  }

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteRedirectUrl(),
    data: {
      first_name: firstName || null,
      last_name: lastName || null,
      full_name: [firstName, lastName].filter(Boolean).join(" ") || null,
      organization_id: orgId,
      role,
    },
  });

  // Happy path: a brand-new auth user was created and emailed an invite.
  if (!inviteError && inviteData?.user) {
    const { error: upsertError } = await admin.from("profiles").upsert(
      {
        id: inviteData.user.id,
        organization_id: orgId,
        first_name: firstName || null,
        last_name: lastName || null,
        email,
        role,
        status: PROFILE_STATUS.invited,
      },
      { onConflict: "id" },
    );

    if (upsertError) {
      return { error: "Invite email was sent but the CRM profile could not be saved. Try again." };
    }

    await logActivity({
      organizationId: orgId,
      actorId: user.id,
      entityType: "profile",
      entityId: inviteData.user.id,
      action: "user_invited",
      metadata: { email, role },
    });
    revalidatePath(USERS_PATH);
    invalidateCacheTags([cacheTags.orgProfiles(orgId)]);
    return { message: `Invite sent to ${email}.` };
  }

  // The auth user already exists (e.g. an exhibition-website account) but has no CRM profile.
  // Grant CRM access only after an exact email match, and only inside this super_admin's org.
  if (inviteError && isAlreadyRegisteredError(inviteError.message)) {
    const existingAuthUserId = await findAuthUserIdByEmail(admin, email);

    if (!existingAuthUserId) {
      return {
        error: "An account may already exist for this email, but it could not be verified. Contact an administrator.",
      };
    }

    const { error: upsertError } = await admin.from("profiles").upsert(
      {
        id: existingAuthUserId,
        organization_id: orgId,
        first_name: firstName || null,
        last_name: lastName || null,
        email,
        role,
        status: PROFILE_STATUS.invited,
      },
      { onConflict: "id" },
    );

    if (upsertError) {
      return { error: "Could not grant CRM access to the existing account. Try again." };
    }

    await logActivity({
      organizationId: orgId,
      actorId: user.id,
      entityType: "profile",
      entityId: existingAuthUserId,
      action: "user_granted_existing_account",
      metadata: { email, role },
    });
    revalidatePath(USERS_PATH);
    invalidateCacheTags([cacheTags.orgProfiles(orgId)]);
    return {
      message: `An existing account for ${email} was granted CRM access. They can sign in with their existing login.`,
    };
  }

  // Any other auth error is not surfaced verbatim.
  return { error: "Could not send the invitation. Try again later." };
}

export async function updateUser(formData: FormData): Promise<void> {
  const { user, profile } = await requireSuperAdmin();
  const orgId = resolveOrgId(profile.organization_id);

  if (!orgId) {
    redirect(`${USERS_PATH}?error=no_org`);
  }

  const userId = String(formData.get("user_id") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const phone = String(formData.get("phone") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const status = String(formData.get("status") ?? "");
  const confirmed = String(formData.get("confirm") ?? "") === "1";

  if (!email || !isValidEmail(email)) {
    redirect(`${USERS_PATH}?error=invalid_email`);
  }

  if (!isAssignableRole(role)) {
    redirect(`${USERS_PATH}?error=invalid_role`);
  }
  if (status !== PROFILE_STATUS.active && status !== PROFILE_STATUS.disabled && status !== PROFILE_STATUS.invited) {
    redirect(`${USERS_PATH}?error=invalid_status`);
  }

  const admin = createSupabaseAdminClient();
  const target = await loadTargetInOrg(admin, userId, orgId);

  if (!target) {
    redirect(`${USERS_PATH}?error=user_not_found`);
  }

  const wasActiveSuperAdmin =
    target.role === SUPER_ADMIN_ROLE && target.status === PROFILE_STATUS.active;
  const losesSuperAdmin = wasActiveSuperAdmin && role !== SUPER_ADMIN_ROLE;
  const becomesInactive = wasActiveSuperAdmin && status !== PROFILE_STATUS.active;

  if ((losesSuperAdmin || becomesInactive) && (await countActiveSuperAdmins(admin, orgId)) <= 1) {
    redirect(`${USERS_PATH}?error=last_super_admin`);
  }

  if (target.id === user.id && status === PROFILE_STATUS.disabled && !confirmed) {
    redirect(`${USERS_PATH}?error=self_disable_unconfirmed`);
  }

  const { error } = await admin
    .from("profiles")
    .update({
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      phone: phone || null,
      position: position || null,
      role,
      status,
    })
    .eq("id", userId);

  if (error) {
    redirect(`${USERS_PATH}?error=update_failed`);
  }

  await logActivity({
    organizationId: orgId,
    actorId: user.id,
    entityType: "profile",
    entityId: userId,
    action: "user_updated",
    metadata: { role, status },
  });
  revalidatePath(USERS_PATH);
  invalidateCacheTags([cacheTags.orgProfiles(orgId)]);
  redirect(`${USERS_PATH}?notice=user_updated`);
}

export async function disableUser(formData: FormData): Promise<void> {
  const { user, profile } = await requireSuperAdmin();
  const orgId = resolveOrgId(profile.organization_id);

  if (!orgId) {
    redirect(`${USERS_PATH}?error=no_org`);
  }

  const userId = String(formData.get("user_id") ?? "");
  const confirmed = String(formData.get("confirm") ?? "") === "1";

  const admin = createSupabaseAdminClient();
  const target = await loadTargetInOrg(admin, userId, orgId);

  if (!target) {
    redirect(`${USERS_PATH}?error=user_not_found`);
  }

  if (target.status === PROFILE_STATUS.disabled) {
    redirect(`${USERS_PATH}?notice=user_disabled`);
  }

  const wasActiveSuperAdmin =
    target.role === SUPER_ADMIN_ROLE && target.status === PROFILE_STATUS.active;
  if (wasActiveSuperAdmin && (await countActiveSuperAdmins(admin, orgId)) <= 1) {
    redirect(`${USERS_PATH}?error=last_super_admin`);
  }

  if (target.id === user.id && !confirmed) {
    redirect(`${USERS_PATH}?error=self_disable_unconfirmed`);
  }

  const { error } = await admin
    .from("profiles")
    .update({ status: PROFILE_STATUS.disabled })
    .eq("id", userId);

  if (error) {
    redirect(`${USERS_PATH}?error=disable_failed`);
  }

  await logActivity({
    organizationId: orgId,
    actorId: user.id,
    entityType: "profile",
    entityId: userId,
    action: "user_disabled",
    metadata: { email: target.email },
  });
  revalidatePath(USERS_PATH);
  invalidateCacheTags([cacheTags.orgProfiles(orgId)]);
  redirect(`${USERS_PATH}?notice=user_disabled`);
}

export async function resendInvite(formData: FormData): Promise<void> {
  const { user, profile } = await requireSuperAdmin();
  const orgId = resolveOrgId(profile.organization_id);

  if (!orgId) {
    redirect(`${USERS_PATH}?error=no_org`);
  }

  const userId = String(formData.get("user_id") ?? "");
  const admin = createSupabaseAdminClient();
  const target = await loadTargetInOrg(admin, userId, orgId);

  if (!target || !target.email) {
    redirect(`${USERS_PATH}?error=user_not_found`);
  }

  if (target.status !== PROFILE_STATUS.invited) {
    redirect(`${USERS_PATH}?error=resend_not_invited`);
  }

  const { error } = await admin.auth.admin.inviteUserByEmail(target.email, {
    redirectTo: inviteRedirectUrl(),
    data: {
      first_name: target.first_name,
      last_name: target.last_name,
      full_name: target.full_name,
      organization_id: orgId,
      role: target.role,
    },
  });

  // Already-registered means the account exists; the user can simply sign in, so treat as success.
  if (error && !isAlreadyRegisteredError(error.message)) {
    redirect(`${USERS_PATH}?error=resend_failed`);
  }

  await logActivity({
    organizationId: orgId,
    actorId: user.id,
    entityType: "profile",
    entityId: userId,
    action: "user_invite_resent",
    metadata: { email: target.email },
  });
  redirect(`${USERS_PATH}?notice=invite_resent`);
}
