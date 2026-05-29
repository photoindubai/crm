import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAuthNameFields } from "@/lib/profile-display";
import type { Database } from "@/lib/supabase/database.types";

type AdminClient = SupabaseClient<Database>;

/**
 * Fills empty CRM profile fields from auth.users on login. Never overwrites values the user or an
 * admin already set in public.profiles.
 */
export async function syncProfileFromAuth(admin: AdminClient, userId: string): Promise<void> {
  const { data: authData, error: authError } = await admin.auth.admin.getUserById(userId);
  if (authError || !authData.user) {
    return;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email,first_name,last_name,phone")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return;
  }

  const meta = (authData.user.user_metadata ?? {}) as Record<string, unknown>;
  const parsed = parseAuthNameFields(meta);
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {};

  if (!profile.email?.trim() && authData.user.email) {
    patch.email = authData.user.email;
  }
  if (!profile.first_name?.trim() && parsed.first_name) {
    patch.first_name = parsed.first_name;
  }
  if (!profile.last_name?.trim() && parsed.last_name) {
    patch.last_name = parsed.last_name;
  }
  if (!profile.phone?.trim()) {
    const phone = typeof meta.phone === "string" ? meta.phone.trim() : "";
    if (phone) {
      patch.phone = phone;
    }
  }

  if (Object.keys(patch).length === 0) {
    return;
  }

  await admin.from("profiles").update(patch).eq("id", userId);
}
