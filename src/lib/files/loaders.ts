import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LOGO_FILE_CATEGORY, type LogoRole } from "@/lib/files/logoRoles";
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

export async function loadCompanyLogoSet(companyId: string) {
  return loadLogoSet({
    entityType: "company",
    entityId: companyId,
  });
}

export async function loadBrandLogoSet(brandId: string) {
  return loadLogoSet({
    entityType: "brand",
    entityId: brandId,
  });
}

async function loadFileById(fileId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("files").select("*").eq("id", fileId).maybeSingle();
  if (error) {
    return null;
  }
  return data as FileRow | null;
}

async function loadLogoSet(params: { entityType: "company" | "brand"; entityId: string }) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId)
    .eq("file_category", LOGO_FILE_CATEGORY)
    .in("status", ["approved", "uploaded"])
    .order("created_at", { ascending: false });

  if (error) {
    return {
      full: null,
      thumb: null,
      full_inverted: null,
      thumb_inverted: null,
      primary: null,
    } as const;
  }

  const rows = (data ?? []) as FileRow[];
  return {
    full: pickNewestByRole(rows, "full"),
    thumb: pickNewestByRole(rows, "thumb"),
    full_inverted: pickNewestByRole(rows, "full_inverted"),
    thumb_inverted: pickNewestByRole(rows, "thumb_inverted"),
    primary: pickNewestByRole(rows, "primary"),
  } as const;
}

function pickNewestByRole(rows: FileRow[], role: LogoRole | "primary") {
  for (const row of rows) {
    if (row.file_role === role) {
      return row;
    }
  }
  return null;
}
