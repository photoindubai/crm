"use server";

import { redirect } from "next/navigation";
import { invalidateBrand, invalidateContact, invalidateParticipation } from "@/lib/cache/invalidate";
import { requireActiveProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type ParticipationScope = {
  id: string;
  event_id: string | null;
  company_id: string | null;
};

async function loadParticipationScope(
  supabase: SupabaseClient<Database>,
  participationId: string,
  organizationId: string,
) {
  const { data, error } = await supabase
    .from("participations")
    .select("id,event_id,company_id")
    .eq("id", participationId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ParticipationScope;
}

function revalidateParticipation(orgId: string, participation: ParticipationScope) {
  invalidateParticipation(orgId, participation.event_id, participation.id, participation.company_id);
}

function buildParticipationUrl(participationId: string, params?: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `/participations/${participationId}?${query}` : `/participations/${participationId}`;
}

export async function saveParticipationMaterial(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const participationId = String(formData.get("participation_id") ?? "");
  const materialId = String(formData.get("material_id") ?? "").trim();

  if (!participationId) {
    redirect("/participations");
  }

  const title = nullableText(formData.get("title"));
  const materialType = nullableText(formData.get("material_type"));
  const status = nullableText(formData.get("status"));
  const url = nullableText(formData.get("url"));
  const notes = nullableText(formData.get("notes"));

  if (!url) {
    redirect(buildParticipationUrl(participationId, { panel: "material", material_id: materialId || undefined, error: "material_url_required" }));
  }

  const participation = await loadParticipationScope(supabase, participationId, organizationId);

  if (!participation) {
    redirect("/participations");
  }

  const payload = {
    participation_id: participationId,
    title,
    material_type: materialType,
    status,
    url,
    notes,
  };

  if (materialId) {
    const { error } = await supabase.from("exhibitor_materials").update(payload).eq("id", materialId).eq("participation_id", participationId);

    if (error) {
      redirect(buildParticipationUrl(participationId, { panel: "material", material_id: materialId, error: "material_save_failed" }));
    }
  } else {
    const { error } = await supabase.from("exhibitor_materials").insert(payload);

    if (error) {
      redirect(buildParticipationUrl(participationId, { panel: "material", error: "material_save_failed" }));
    }
  }

  revalidateParticipation(organizationId, participation);
  redirect(buildParticipationUrl(participationId, { notice: materialId ? "material_updated" : "material_created" }));
}

export async function deleteParticipationMaterial(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const participationId = String(formData.get("participation_id") ?? "");
  const materialId = String(formData.get("material_id") ?? "");

  if (!participationId) {
    redirect("/participations");
  }

  if (!materialId) {
    redirect(buildParticipationUrl(participationId, { error: "material_delete_failed" }));
  }

  const participation = await loadParticipationScope(supabase, participationId, organizationId);

  if (!participation) {
    redirect("/participations");
  }

  const { error } = await supabase.from("exhibitor_materials").delete().eq("id", materialId).eq("participation_id", participationId);

  if (error) {
    redirect(buildParticipationUrl(participationId, { error: "material_delete_failed" }));
  }

  revalidateParticipation(organizationId, participation);
  redirect(buildParticipationUrl(participationId, { notice: "material_deleted" }));
}

export async function saveParticipationBrand(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const participationId = String(formData.get("participation_id") ?? "");
  const brandLinkId = String(formData.get("brand_link_id") ?? "").trim();
  const oldBrandId = String(formData.get("old_brand_id") ?? "").trim();
  const brandId = String(formData.get("brand_id") ?? "").trim();
  const displayOnWebsite = formData.get("display_on_website") === "on";
  const priorityValue = String(formData.get("priority") ?? "").trim();
  const priority = priorityValue ? Number(priorityValue) : null;

  if (!participationId) {
    redirect("/participations");
  }

  if (!brandId) {
    redirect(buildParticipationUrl(participationId, { panel: "brand", brand_link_id: brandLinkId || undefined, error: "brand_required" }));
  }

  const participation = await loadParticipationScope(supabase, participationId, organizationId);

  if (!participation) {
    redirect("/participations");
  }

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (brandError || !brand) {
    redirect(buildParticipationUrl(participationId, { panel: "brand", brand_link_id: brandLinkId || undefined, error: "brand_not_found" }));
  }

  const payload = {
    participation_id: participationId,
    brand_id: brandId,
    display_on_website: displayOnWebsite,
    priority,
  };

  if (brandLinkId) {
    const { error } = await supabase.from("participation_brands").update(payload).eq("id", brandLinkId).eq("participation_id", participationId);

    if (error) {
      redirect(buildParticipationUrl(participationId, { panel: "brand", brand_link_id: brandLinkId, error: "brand_save_failed" }));
    }
  } else {
    const { error } = await supabase.from("participation_brands").insert(payload);

    if (error) {
      redirect(buildParticipationUrl(participationId, { panel: "brand", error: "brand_save_failed" }));
    }
  }

  if (participation.company_id) {
    const { data: existingCompanyBrand } = await supabase
      .from("company_brands")
      .select("id")
      .eq("company_id", participation.company_id)
      .eq("brand_id", brandId)
      .maybeSingle();

    if (!existingCompanyBrand?.id) {
      await supabase.from("company_brands").insert({
        company_id: participation.company_id,
        brand_id: brandId,
      });
    }
  }

  revalidateParticipation(organizationId, participation);
  invalidateBrand(organizationId, brandId, {
    companyIds: participation.company_id ? [participation.company_id] : [],
    eventIds: participation.event_id ? [participation.event_id] : [],
  });
  if (oldBrandId && oldBrandId !== brandId) {
    invalidateBrand(organizationId, oldBrandId, {
      companyIds: participation.company_id ? [participation.company_id] : [],
      eventIds: participation.event_id ? [participation.event_id] : [],
    });
  }

  redirect(buildParticipationUrl(participationId, { notice: brandLinkId ? "brand_updated" : "brand_added" }));
}

export async function deleteParticipationBrand(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const participationId = String(formData.get("participation_id") ?? "");
  const brandLinkId = String(formData.get("brand_link_id") ?? "");
  const brandId = String(formData.get("brand_id") ?? "");

  if (!participationId) {
    redirect("/participations");
  }

  const participation = await loadParticipationScope(supabase, participationId, organizationId);

  if (!participation) {
    redirect("/participations");
  }

  const { error } = await supabase.from("participation_brands").delete().eq("id", brandLinkId).eq("participation_id", participationId);

  if (error) {
    redirect(buildParticipationUrl(participationId, { error: "brand_delete_failed" }));
  }

  revalidateParticipation(organizationId, participation);
  if (brandId) {
    invalidateBrand(organizationId, brandId, {
      companyIds: participation.company_id ? [participation.company_id] : [],
      eventIds: participation.event_id ? [participation.event_id] : [],
    });
  }

  redirect(buildParticipationUrl(participationId, { notice: "brand_deleted" }));
}

export async function saveParticipationContact(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const participationId = String(formData.get("participation_id") ?? "");
  const contactLinkId = String(formData.get("contact_link_id") ?? "").trim();
  const contactId = String(formData.get("contact_id") ?? "").trim();
  const role = nullableText(formData.get("role"));
  const isPrimary = formData.get("is_primary") === "on";

  if (!participationId) {
    redirect("/participations");
  }

  const participation = await loadParticipationScope(supabase, participationId, organizationId);

  if (!participation) {
    redirect("/participations");
  }

  if (!participation.company_id) {
    redirect(buildParticipationUrl(participationId, { panel: "contact", contact_link_id: contactLinkId || undefined, error: "participant_contact_invalid" }));
  }

  if (!contactId) {
    redirect(buildParticipationUrl(participationId, { panel: "contact", contact_link_id: contactLinkId || undefined, error: "participant_contact_required" }));
  }

  const { data: companyContactLink, error: companyContactError } = await supabase
    .from("company_contacts")
    .select("id")
    .eq("company_id", participation.company_id)
    .eq("contact_id", contactId)
    .maybeSingle();

  if (companyContactError || !companyContactLink) {
    redirect(buildParticipationUrl(participationId, { panel: "contact", contact_link_id: contactLinkId || undefined, error: "participant_contact_invalid" }));
  }

  if (isPrimary) {
    await supabase.from("participation_contacts").update({ is_primary: false }).eq("participation_id", participationId);
  }

  const payload = {
    participation_id: participationId,
    contact_id: contactId,
    role,
    is_primary: isPrimary,
  };

  if (contactLinkId) {
    const { error } = await supabase.from("participation_contacts").update(payload).eq("id", contactLinkId).eq("participation_id", participationId);

    if (error) {
      redirect(buildParticipationUrl(participationId, { panel: "contact", contact_link_id: contactLinkId, error: "participant_contact_save_failed" }));
    }
  } else {
    const { error } = await supabase.from("participation_contacts").insert(payload);

    if (error) {
      redirect(buildParticipationUrl(participationId, { panel: "contact", error: "participant_contact_save_failed" }));
    }
  }

  revalidateParticipation(organizationId, participation);
  invalidateContact(organizationId, contactId, { companyIds: [participation.company_id], participationIds: [participationId] });

  redirect(buildParticipationUrl(participationId, { notice: contactLinkId ? "participant_contact_updated" : "participant_contact_added" }));
}

export async function deleteParticipationContact(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const participationId = String(formData.get("participation_id") ?? "");
  const contactLinkId = String(formData.get("contact_link_id") ?? "");
  const contactId = String(formData.get("contact_id") ?? "");

  if (!participationId) {
    redirect("/participations");
  }

  const participation = await loadParticipationScope(supabase, participationId, organizationId);

  if (!participation) {
    redirect("/participations");
  }

  const { error } = await supabase.from("participation_contacts").delete().eq("id", contactLinkId).eq("participation_id", participationId);

  if (error) {
    redirect(buildParticipationUrl(participationId, { error: "participant_contact_delete_failed" }));
  }

  revalidateParticipation(organizationId, participation);
  if (contactId) {
    invalidateContact(organizationId, contactId, {
      companyIds: participation.company_id ? [participation.company_id] : [],
      participationIds: [participationId],
    });
  }

  redirect(buildParticipationUrl(participationId, { notice: "participant_contact_deleted" }));
}

export async function saveParticipationLogistics(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const participationId = String(formData.get("participation_id") ?? "");

  if (!participationId) {
    redirect("/participations");
  }

  const participation = await loadParticipationScope(supabase, participationId, organizationId);

  if (!participation) {
    redirect("/participations");
  }

  const payload = {
    participation_id: participationId,
    badges_status: nullableText(formData.get("badges_status")),
    room_asset_status: nullableText(formData.get("room_asset_status")),
    check_in_status: nullableText(formData.get("check_in_status")),
    furniture_status: nullableText(formData.get("furniture_status")),
    electricity_status: nullableText(formData.get("electricity_status")),
    internet_status: nullableText(formData.get("internet_status")),
    fascia_status: nullableText(formData.get("fascia_status")),
    stand_design_status: nullableText(formData.get("stand_design_status")),
    conference_status: nullableText(formData.get("conference_status")),
  };

  const { data: existing, error: existingError } = await supabase
    .from("participation_logistics")
    .select("id")
    .eq("participation_id", participationId)
    .maybeSingle();

  if (existingError) {
    redirect(buildParticipationUrl(participationId, { error: "logistics_save_failed" }));
  }

  if (existing?.id) {
    const { error } = await supabase.from("participation_logistics").update(payload).eq("id", existing.id);

    if (error) {
      redirect(buildParticipationUrl(participationId, { error: "logistics_save_failed" }));
    }
  } else {
    const { error } = await supabase.from("participation_logistics").insert(payload);

    if (error) {
      redirect(buildParticipationUrl(participationId, { error: "logistics_save_failed" }));
    }
  }

  revalidateParticipation(organizationId, participation);
  redirect(buildParticipationUrl(participationId, { notice: "logistics_saved" }));
}

export async function addParticipationSection(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const participationId = String(formData.get("participation_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "").trim();

  if (!participationId) {
    redirect("/participations");
  }
  if (!sectionId) {
    redirect(buildParticipationUrl(participationId, { panel: "section", error: "section_required" }));
  }

  const participation = await loadParticipationScope(supabase, participationId, organizationId);

  if (!participation) {
    redirect("/participations");
  }
  if (!participation.event_id) {
    redirect(buildParticipationUrl(participationId, { panel: "section", error: "section_event_missing" }));
  }

  const { data: section, error: sectionError } = await supabase
    .from("event_sections")
    .select("id")
    .eq("id", sectionId)
    .eq("event_id", participation.event_id)
    .maybeSingle();

  if (sectionError || !section) {
    redirect(buildParticipationUrl(participationId, { panel: "section", error: "section_invalid" }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from("participation_sections")
    .select("id")
    .eq("participation_id", participationId)
    .eq("section_id", sectionId)
    .maybeSingle();

  if (!existing?.id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("participation_sections").insert({
      participation_id: participationId,
      section_id: sectionId,
    });

    if (error) {
      redirect(buildParticipationUrl(participationId, { panel: "section", error: "section_save_failed" }));
    }
  }

  revalidateParticipation(organizationId, participation);
  redirect(buildParticipationUrl(participationId, { notice: "section_added" }));
}

export async function deleteParticipationSection(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const participationId = String(formData.get("participation_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");

  if (!participationId || !sectionId) {
    redirect("/participations");
  }

  const participation = await loadParticipationScope(supabase, participationId, organizationId);

  if (!participation) {
    redirect("/participations");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("participation_sections")
    .delete()
    .eq("participation_id", participationId)
    .eq("section_id", sectionId);

  if (error) {
    redirect(buildParticipationUrl(participationId, { error: "section_delete_failed" }));
  }

  revalidateParticipation(organizationId, participation);
  redirect(buildParticipationUrl(participationId, { notice: "section_removed" }));
}

function nullableText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function getOrganizationId(value: string | null) {
  if (!value) {
    throw new Error("Active profile has no organization_id");
  }

  return value;
}
