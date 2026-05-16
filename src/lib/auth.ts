import { redirect } from "next/navigation";
import { cacheTags } from "@/lib/cache-tags";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type ActiveProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "full_name" | "role" | "status" | "organization_id"
>;

export async function requireActiveProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const profile = await loadCached(
    {
      keyParts: ["active-profile", user.id],
      tags: [cacheTags.profiles],
    },
    async () => {
      const admin = createSupabaseAdminClient();
      const { data, error: profileError } = await admin
        .from("profiles")
        .select("id,full_name,role,status,organization_id")
        .eq("id", user.id)
        .single();

      if (profileError || !data) {
        return null;
      }

      return data as ActiveProfile;
    },
  );

  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return {
    user,
    profile: profile as ActiveProfile,
  };
}

export function getSafeNextPath(value: FormDataEntryValue | string | null | undefined) {
  const next = String(value ?? "/dashboard");

  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) {
    return "/dashboard";
  }

  return next;
}
