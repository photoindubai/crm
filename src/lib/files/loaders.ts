import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

type FileRow = Database["public"]["Tables"]["files"]["Row"];

export async function loadCompanyPrimaryLogoFile(companyId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("primary_logo_file_id")
    .eq("id", companyId)
    .maybeSingle();

  if (error || !company?.primary_logo_file_id) {
    return null;
  }

  return loadFileById(company.primary_logo_file_id);
}

export async function loadBrandPrimaryLogoFile(brandId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: brand, error } = await supabase
    .from("brands")
    .select("primary_logo_file_id")
    .eq("id", brandId)
    .maybeSingle();

  if (error || !brand?.primary_logo_file_id) {
    return null;
  }

  return loadFileById(brand.primary_logo_file_id);
}

export async function loadParticipationLogoFile(participationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: participation, error } = await supabase
    .from("participations")
    .select("public_logo_file_id")
    .eq("id", participationId)
    .maybeSingle();

  if (error || !participation?.public_logo_file_id) {
    return null;
  }

  return loadFileById(participation.public_logo_file_id);
}

export async function loadParticipationFiles(participationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("participation_id", participationId)
    .order("created_at", { ascending: false });

  if (error) {
    return [] as FileRow[];
  }

  return (data ?? []) as FileRow[];
}

async function loadFileById(fileId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("files").select("*").eq("id", fileId).maybeSingle();
  if (error) {
    return null;
  }
  return data as FileRow | null;
}
