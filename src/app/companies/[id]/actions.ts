"use server";

import { redirect } from "next/navigation";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { invalidateCacheTags } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function buildCompanyUrl(companyId: string, params?: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `/companies/${companyId}?${query}` : `/companies/${companyId}`;
}

export type CompanyContactFormState = {
  status?: "error" | "success";
  message?: string;
  redirectTo?: string;
};

export async function updateCompanyDetails(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const companyId = String(formData.get("company_id") ?? "");
  if (!companyId) {
    redirect("/companies");
  }

  const payload = {
    company_name: String(formData.get("company_name") ?? "").trim(),
    description: nullableText(formData.get("description")),
    address: nullableText(formData.get("address")),
    city: nullableText(formData.get("city")),
    country: nullableText(formData.get("country")),
    company_phone: nullableText(formData.get("company_phone")),
    company_email: nullableText(formData.get("company_email")),
    website: nullableText(formData.get("website")),
    facebook_url: nullableText(formData.get("facebook_url")),
    instagram_url: nullableText(formData.get("instagram_url")),
    linkedin_url: nullableText(formData.get("linkedin_url")),
    youtube_url: nullableText(formData.get("youtube_url")),
    other_social_url: nullableText(formData.get("other_social_url")),
    company_logo_url: nullableText(formData.get("company_logo_url")),
  };

  if (!payload.company_name) {
    redirect(buildCompanyUrl(companyId, { panel: "edit", error: "company_name_required" }));
  }

  const { error } = await supabase
    .from("companies")
    .update(payload)
    .eq("id", companyId)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(buildCompanyUrl(companyId, { panel: "edit", error: "company_update_failed" }));
  }

  invalidateCacheTags([cacheTags.companies, cacheTags.company(companyId)]);
  redirect(buildCompanyUrl(companyId, { notice: "company_saved" }));
}

export async function createCompanyContact(
  _state: CompanyContactFormState,
  formData: FormData,
): Promise<CompanyContactFormState> {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const companyId = String(formData.get("company_id") ?? "");
  if (!companyId) {
    return { status: "error", message: "Company was not provided." };
  }

  const firstName = nullableText(formData.get("first_name"));
  const lastName = nullableText(formData.get("last_name"));
  const email = nullableEmail(formData.get("email"));
  const phone = nullableText(formData.get("phone"));
  const position = nullableText(formData.get("position"));
  const role = nullableText(formData.get("role"));
  const isPrimary = formData.get("is_primary") === "on";

  if (!firstName && !lastName && !email) {
    return { status: "error", message: "Add at least a contact name or email." };
  }

  let contactId: string | null = null;

  if (email) {
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .maybeSingle();

    contactId = existingContact?.id ?? null;
  }

  if (!contactId) {
    const { data: createdContact, error: createContactError } = await supabase
      .from("contacts")
      .insert({
        organization_id: organizationId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        position,
      })
      .select("id")
      .single();

    if (createContactError || !createdContact) {
      return { status: "error", message: "Failed to create contact." };
    }

    contactId = createdContact.id;
  } else {
    const { error: updateContactError } = await supabase
      .from("contacts")
      .update({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        position,
      })
      .eq("id", contactId)
      .eq("organization_id", organizationId);

    if (updateContactError) {
      return { status: "error", message: "Failed to update contact." };
    }
  }

  if (isPrimary) {
    await supabase.from("company_contacts").update({ is_primary: false }).eq("company_id", companyId);
  }

  const { data: existingLink } = await supabase
    .from("company_contacts")
    .select("id")
    .eq("company_id", companyId)
    .eq("contact_id", contactId)
    .maybeSingle();

  if (existingLink?.id) {
    const { error: updateLinkError } = await supabase
      .from("company_contacts")
      .update({
        role,
        is_primary: isPrimary,
      })
      .eq("id", existingLink.id);

    if (updateLinkError) {
      return { status: "error", message: "Failed to link contact to company." };
    }
  } else {
    const { error: createLinkError } = await supabase
      .from("company_contacts")
      .insert({
        company_id: companyId,
        contact_id: contactId,
        role,
        is_primary: isPrimary,
      });

    if (createLinkError) {
      return { status: "error", message: "Failed to link contact to company." };
    }
  }

  invalidateCacheTags([
    cacheTags.companies,
    cacheTags.company(companyId),
    cacheTags.contacts,
    cacheTags.contact(contactId),
  ]);

  return {
    status: "success",
    message: "Contact saved.",
    redirectTo: buildCompanyUrl(companyId, { notice: "contact_saved" }),
  };
}

export async function assignCompanyBrand(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const companyId = String(formData.get("company_id") ?? "");
  const brandId = String(formData.get("brand_id") ?? "");

  if (!companyId) {
    redirect("/companies");
  }

  if (!brandId) {
    redirect(buildCompanyUrl(companyId, { panel: "brand", error: "brand_required" }));
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!brand) {
    redirect(buildCompanyUrl(companyId, { panel: "brand", error: "brand_not_found" }));
  }

  const { data: existingLink } = await supabase
    .from("company_brands")
    .select("id")
    .eq("company_id", companyId)
    .eq("brand_id", brandId)
    .maybeSingle();

  if (!existingLink?.id) {
    const { error } = await supabase.from("company_brands").insert({
      company_id: companyId,
      brand_id: brandId,
    });

    if (error) {
      redirect(buildCompanyUrl(companyId, { panel: "brand", error: "brand_assign_failed" }));
    }
  }

  invalidateCacheTags([
    cacheTags.companies,
    cacheTags.company(companyId),
    cacheTags.brands,
    cacheTags.brand(brandId),
  ]);
  redirect(buildCompanyUrl(companyId, { notice: "brand_assigned" }));
}

function nullableText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

function nullableEmail(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized ? normalized : null;
}

function getOrganizationId(value: string | null) {
  if (!value) {
    throw new Error("Active profile has no organization_id");
  }

  return value;
}
