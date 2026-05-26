"use server";

import { redirect } from "next/navigation";
import { invalidateEvent } from "@/lib/cache/invalidate";
import { requireActiveProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function buildEventsUrl(params?: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `/events?${query}` : "/events";
}

export async function createEvent(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const eventName = nullableText(formData.get("event_name"));
  const payload = {
    organization_id: organizationId,
    event_name: eventName,
    venue_name: nullableText(formData.get("venue_name")),
    city: nullableText(formData.get("city")),
    country: nullableText(formData.get("country")),
    start_date: nullableText(formData.get("start_date")),
    end_date: nullableText(formData.get("end_date")),
    status: nullableText(formData.get("status")) ?? "planning",
  };

  if (!payload.event_name) {
    redirect(buildEventsUrl({ panel: "create", error: "event_name_required" }));
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: organizationId,
      event_name: payload.event_name,
      venue_name: payload.venue_name,
      city: payload.city,
      country: payload.country,
      start_date: payload.start_date,
      end_date: payload.end_date,
      status: payload.status,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(buildEventsUrl({ panel: "create", error: "event_create_failed" }));
  }

  invalidateEvent(organizationId, data.id);
  redirect(`/events/${data.id}?notice=event_created`);
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
