import { redirect } from "next/navigation";
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

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,full_name,role,status,organization_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.status !== "active") {
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
