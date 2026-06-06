"use server";

import { revalidatePath } from "next/cache";
import { requireActiveProfile } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import { invalidateCacheTags } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ProfileFormState = {
  error?: string;
  message?: string;
};

function nullableText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Self-service profile update. Role, status, and organization are never writable here. */
export async function updateMyProfile(_state: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const { user, profile } = await requireActiveProfile();
  const orgId = profile.organization_id;

  const firstName = nullableText(formData.get("first_name"));
  const lastName = nullableText(formData.get("last_name"));
  const email = nullableText(formData.get("email"))?.toLowerCase() ?? "";
  const position = nullableText(formData.get("position"));
  const phone = nullableText(formData.get("phone"));

  if (!email || !isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  if (!firstName && !lastName) {
    return { error: "Enter at least a first or last name." };
  }

  const admin = createSupabaseAdminClient();

  if (email !== (profile.email ?? "").toLowerCase()) {
    const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existing && existing.id !== user.id) {
      return { error: "Another CRM user already uses this email." };
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
      position,
      phone,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Failed to save profile. Try again." };
  }

  if (orgId) {
    invalidateCacheTags([cacheTags.orgProfiles(orgId), cacheTags.profile(user.id)]);
  }
  revalidatePath("/settings/profile");
  revalidatePath("/", "layout");

  return { message: "Profile saved." };
}
