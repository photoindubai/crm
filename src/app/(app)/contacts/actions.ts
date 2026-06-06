"use server";

import { redirect } from "next/navigation";
import { invalidateActions, invalidateContact, invalidateNotes } from "@/lib/cache/invalidate";
import { getSafeNextPath, requireActiveProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function buildContactUrl(contactId: string, params?: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `/contacts/${contactId}?${query}` : `/contacts/${contactId}`;
}

function appendParams(path: string, params?: Record<string, string | undefined>) {
  const url = new URL(path, "http://localhost");

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return `${url.pathname}${url.search}`;
}

export async function updateContactDetails(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const contactId = String(formData.get("contact_id") ?? "");
  const returnTo = getSafeNextPath(formData.get("return_to") ?? "/contacts");

  if (!contactId) {
    redirect("/contacts");
  }

  const payload = {
    first_name: nullableText(formData.get("first_name")),
    last_name: nullableText(formData.get("last_name")),
    email: nullableEmail(formData.get("email")),
    phone: nullableText(formData.get("phone")),
    position: nullableText(formData.get("position")),
  };

  if (!payload.first_name && !payload.last_name && !payload.email) {
    redirect(buildContactUrl(contactId, { edit: "1", returnTo, error: "contact_identity_required" }));
  }

  const { error } = await supabase
    .from("contacts")
    .update(payload)
    .eq("id", contactId)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(buildContactUrl(contactId, { edit: "1", returnTo, error: "contact_update_failed" }));
  }

  invalidateContact(organizationId, contactId);
  redirect(appendParams(returnTo === "/dashboard" ? `/contacts/${contactId}` : returnTo, { notice: "contact_updated" }));
}

export async function deleteContact(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const contactId = String(formData.get("contact_id") ?? "");
  const returnTo = getSafeNextPath(formData.get("return_to") ?? "/contacts");

  if (!contactId) {
    redirect("/contacts");
  }

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (contactError || !contact) {
    redirect(appendParams(returnTo, { error: "contact_not_found" }));
  }

  const [companyLinksResult, participationLinksResult] = await Promise.all([
    supabase.from("company_contacts").select("company_id").eq("contact_id", contactId),
    supabase.from("participation_contacts").select("participation_id").eq("contact_id", contactId),
  ]);

  if (companyLinksResult.error || participationLinksResult.error) {
    redirect(appendParams(returnTo, { error: "contact_delete_failed" }));
  }

  const companyIds = uniqueIds((companyLinksResult.data ?? []).map((row) => row.company_id));
  const participationIds = uniqueIds((participationLinksResult.data ?? []).map((row) => row.participation_id));

  const [deleteCompanyLinks, deleteParticipationLinks, deleteRecipients, deleteSubjects, clearNotes] = await Promise.all([
    supabase.from("company_contacts").delete().eq("contact_id", contactId),
    supabase.from("participation_contacts").delete().eq("contact_id", contactId),
    supabase.from("action_recipients").delete().eq("contact_id", contactId),
    supabase.from("action_subjects").delete().eq("contact_id", contactId),
    supabase.from("notes").update({ contact_id: null }).eq("contact_id", contactId),
  ]);

  const relationError =
    deleteCompanyLinks.error ??
    deleteParticipationLinks.error ??
    deleteRecipients.error ??
    deleteSubjects.error ??
    clearNotes.error;

  if (relationError) {
    redirect(appendParams(returnTo, { error: "contact_delete_failed" }));
  }

  const { error: deleteContactError } = await supabase
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("organization_id", organizationId);

  if (deleteContactError) {
    redirect(appendParams(returnTo, { error: "contact_delete_failed" }));
  }

  invalidateContact(organizationId, contactId, { companyIds, participationIds });
  invalidateActions(organizationId, { companyIds, participationIds, contactIds: [contactId] });
  for (const companyId of companyIds) {
    invalidateNotes(organizationId, companyId);
  }

  redirect(appendParams(returnTo, { notice: "contact_deleted" }));
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

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}
