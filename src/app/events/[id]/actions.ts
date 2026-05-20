"use server";

import { redirect } from "next/navigation";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { invalidateCacheTags } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function buildEventUrl(eventId: string, params?: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `/events/${eventId}?${query}` : `/events/${eventId}`;
}

export async function updateEventDetails(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) {
    redirect("/events");
  }

  const payload = {
    event_name: nullableText(formData.get("event_name")),
    venue_name: nullableText(formData.get("venue_name")),
    city: nullableText(formData.get("city")),
    country: nullableText(formData.get("country")),
    start_date: nullableText(formData.get("start_date")),
    end_date: nullableText(formData.get("end_date")),
    status: nullableText(formData.get("status")),
  };

  if (!payload.event_name) {
    redirect(buildEventUrl(eventId, { edit: "1", error: "event_name_required" }));
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (eventError || !event) {
    redirect("/events");
  }

  const { error: updateError } = await supabase
    .from("events")
    .update(payload)
    .eq("id", eventId)
    .eq("organization_id", organizationId);

  if (updateError) {
    redirect(buildEventUrl(eventId, { edit: "1", error: "event_update_failed" }));
  }

  invalidateCacheTags([
    cacheTags.events,
    cacheTags.event(eventId),
    cacheTags.participations,
    cacheTags.actions,
  ]);

  redirect(buildEventUrl(eventId, { notice: "event_saved" }));
}

export async function deleteEvent(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const eventId = String(formData.get("event_id") ?? "");
  if (!eventId) {
    redirect("/events");
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (eventError || !event) {
    redirect("/events?error=event_not_found");
  }

  const { count: participationsCount, error: participationsError } = await supabase
    .from("participations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("event_id", eventId);

  if (participationsError) {
    redirect(buildEventUrl(eventId, { error: "event_delete_failed" }));
  }

  if ((participationsCount ?? 0) > 0) {
    redirect(buildEventUrl(eventId, { error: "event_delete_blocked_participations" }));
  }

  const { error: deleteError } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("organization_id", organizationId);

  if (deleteError) {
    redirect(buildEventUrl(eventId, { error: "event_delete_failed" }));
  }

  invalidateCacheTags([
    cacheTags.events,
    cacheTags.event(eventId),
    cacheTags.participations,
    cacheTags.actions,
  ]);
  redirect("/events?notice=event_deleted");
}

export async function saveEventSection(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const eventId = String(formData.get("event_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "").trim();
  const name = nullableText(formData.get("name"));
  const slug = nullableText(formData.get("slug"));
  const sortOrderRaw = String(formData.get("sort_order") ?? "").trim();
  const sortOrder = sortOrderRaw ? Number(sortOrderRaw) : 0;

  if (!eventId) {
    redirect("/events");
  }
  if (!name) {
    redirect(buildEventUrl(eventId, { panel: "section", error: "section_name_required" }));
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!event) {
    redirect("/events");
  }

  const payload = {
    event_id: eventId,
    name,
    slug,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  };

  if (sectionId) {
    const { error } = await supabase.from("event_sections").update(payload).eq("id", sectionId).eq("event_id", eventId);
    if (error) {
      redirect(buildEventUrl(eventId, { panel: "section", error: "section_save_failed" }));
    }
  } else {
    const { error } = await supabase.from("event_sections").insert(payload);
    if (error) {
      redirect(buildEventUrl(eventId, { panel: "section", error: "section_save_failed" }));
    }
  }

  invalidateCacheTags([cacheTags.events, cacheTags.event(eventId)]);
  redirect(buildEventUrl(eventId, { notice: sectionId ? "section_updated" : "section_created" }));
}

export async function deleteEventSection(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);
  const eventId = String(formData.get("event_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");

  if (!eventId || !sectionId) {
    redirect("/events");
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!event) {
    redirect("/events");
  }

  const { count: linkedProgramItems, error: linkedProgramItemsError } = await supabase
    .from("event_program_items")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("section_id", sectionId);

  if (linkedProgramItemsError) {
    redirect(buildEventUrl(eventId, { error: "section_delete_failed" }));
  }

  if ((linkedProgramItems ?? 0) > 0) {
    redirect(buildEventUrl(eventId, { error: "section_delete_blocked_program_items" }));
  }

  const { error } = await supabase.from("event_sections").delete().eq("id", sectionId).eq("event_id", eventId);
  if (error) {
    redirect(buildEventUrl(eventId, { error: "section_delete_failed" }));
  }

  invalidateCacheTags([cacheTags.events, cacheTags.event(eventId)]);
  redirect(buildEventUrl(eventId, { notice: "section_deleted" }));
}

export async function saveEventProgramItem(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const eventId = String(formData.get("event_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "").trim();
  const title = nullableText(formData.get("title"));
  const itemType = nullableText(formData.get("item_type"));
  const sectionId = nullableText(formData.get("section_id"));
  const startsAt = nullableText(formData.get("starts_at"));
  const endsAt = nullableText(formData.get("ends_at"));
  const venue = nullableText(formData.get("venue"));
  const status = nullableText(formData.get("status"));
  const description = nullableText(formData.get("description"));

  if (!eventId) {
    redirect("/events");
  }
  if (!title) {
    redirect(buildEventUrl(eventId, { panel: "program", error: "program_title_required" }));
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!event) {
    redirect("/events");
  }

  const payload = {
    event_id: eventId,
    title,
    item_type: itemType,
    section_id: sectionId,
    starts_at: startsAt,
    ends_at: endsAt,
    venue,
    status,
    description,
  };

  if (itemId) {
    const { error } = await supabase.from("event_program_items").update(payload).eq("id", itemId).eq("event_id", eventId);
    if (error) {
      redirect(buildEventUrl(eventId, { panel: "program", error: "program_save_failed" }));
    }
  } else {
    const { error } = await supabase.from("event_program_items").insert(payload);
    if (error) {
      redirect(buildEventUrl(eventId, { panel: "program", error: "program_save_failed" }));
    }
  }

  invalidateCacheTags([cacheTags.events, cacheTags.event(eventId)]);
  redirect(buildEventUrl(eventId, { notice: itemId ? "program_updated" : "program_created" }));
}

export async function deleteEventProgramItem(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);
  const eventId = String(formData.get("event_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");

  if (!eventId || !itemId) {
    redirect("/events");
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!event) {
    redirect("/events");
  }

  const { error } = await supabase.from("event_program_items").delete().eq("id", itemId).eq("event_id", eventId);
  if (error) {
    redirect(buildEventUrl(eventId, { error: "program_delete_failed" }));
  }

  invalidateCacheTags([cacheTags.events, cacheTags.event(eventId)]);
  redirect(buildEventUrl(eventId, { notice: "program_deleted" }));
}

export async function saveSectionParticipations(input: {
  eventId: string;
  sectionId: string;
  assignedParticipationIds: string[];
}): Promise<{ error?: string }> {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);
  const { eventId, sectionId, assignedParticipationIds } = input;
  const targetIds = [...new Set(assignedParticipationIds.filter(Boolean))];

  if (!eventId || !sectionId) {
    return { error: "Invalid section request." };
  }

  const [eventResult, sectionResult] = await Promise.all([
    supabase.from("events").select("id").eq("id", eventId).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("event_sections").select("id,event_id").eq("id", sectionId).maybeSingle(),
  ]);

  if (!eventResult.data || !sectionResult.data || sectionResult.data.event_id !== eventId) {
    return { error: "Section and event could not be verified." };
  }

  if (targetIds.length > 0) {
    const { data: participations, error: participationsError } = await supabase
      .from("participations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .in("id", targetIds);

    if (participationsError) {
      return { error: participationsError.message };
    }

    if ((participations ?? []).length !== targetIds.length) {
      return { error: "One or more participants do not belong to this event." };
    }
  }

  const untypedSupabase = supabase as unknown as {
    from: (table: "participation_sections") => {
      select: (columns: "participation_id") => {
        eq: (column: "section_id", value: string) => Promise<{ data: Array<{ participation_id: string }> | null; error: { message: string } | null }>;
      };
      delete: () => {
        eq: (column: "section_id", value: string) => {
          in: (column: "participation_id", values: string[]) => Promise<{ error: { message: string } | null }>;
        };
      };
      insert: (payload: Array<{ participation_id: string; section_id: string }>) => Promise<{ error: { message: string } | null }>;
    };
  };

  const currentResult = await untypedSupabase.from("participation_sections").select("participation_id").eq("section_id", sectionId);

  if (currentResult.error) {
    return { error: currentResult.error.message };
  }

  const currentIds = new Set((currentResult.data ?? []).map((row) => row.participation_id));
  const targetIdSet = new Set(targetIds);
  const toRemove = [...currentIds].filter((participationId) => !targetIdSet.has(participationId));
  const toAdd = targetIds.filter((participationId) => !currentIds.has(participationId));

  if (toRemove.length > 0) {
    const deleteResult = await untypedSupabase
      .from("participation_sections")
      .delete()
      .eq("section_id", sectionId)
      .in("participation_id", toRemove);

    if (deleteResult.error) {
      return { error: "Could not remove participants from section." };
    }
  }

  if (toAdd.length > 0) {
    const insertResult = await untypedSupabase.from("participation_sections").insert(
      toAdd.map((participationId) => ({
        participation_id: participationId,
        section_id: sectionId,
      })),
    );

    if (insertResult.error) {
      return { error: "Could not add participants to section." };
    }
  }

  invalidateCacheTags([cacheTags.events, cacheTags.event(eventId), cacheTags.participations]);
  return {};
}

export async function addSectionParticipation(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const eventId = String(formData.get("event_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");
  const participationId = String(formData.get("participation_id") ?? "");
  const query = nullableText(formData.get("q")) ?? undefined;

  if (!eventId || !sectionId || !participationId) {
    redirect("/events");
  }

  const [eventResult, sectionResult, participationResult] = await Promise.all([
    supabase.from("events").select("id").eq("id", eventId).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("event_sections").select("id,event_id").eq("id", sectionId).maybeSingle(),
    supabase
      .from("participations")
      .select("id,event_id,organization_id")
      .eq("id", participationId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  if (!eventResult.data || !sectionResult.data || !participationResult.data) {
    redirect("/events");
  }

  if (sectionResult.data.event_id !== eventId || participationResult.data.event_id !== eventId) {
    redirect(buildEventUrl(eventId, { panel: "section_members", section_id: sectionId, error: "section_participation_invalid", q: query }));
  }

  const untypedSupabase = supabase as unknown as {
    from: (table: "participation_sections") => {
      select: (columns: "id") => {
        eq: (column: "participation_id", value: string) => {
          eq: (column: "section_id", value: string) => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
      insert: (payload: { participation_id: string; section_id: string }) => Promise<{ error: { message: string } | null }>;
    };
  };

  const existing = await untypedSupabase
    .from("participation_sections")
    .select("id")
    .eq("participation_id", participationId)
    .eq("section_id", sectionId);

  if (!existing.data?.id) {
    const insertResult = await untypedSupabase.from("participation_sections").insert({
      participation_id: participationId,
      section_id: sectionId,
    });

    if (insertResult.error) {
      redirect(buildEventUrl(eventId, { panel: "section_members", section_id: sectionId, error: "section_participation_save_failed", q: query }));
    }
  }

  invalidateCacheTags([cacheTags.events, cacheTags.event(eventId), cacheTags.participations]);
  redirect(buildEventUrl(eventId, { panel: "section_members", section_id: sectionId, notice: "section_participation_added", q: query }));
}

export async function removeSectionParticipation(formData: FormData) {
  const { profile } = await requireActiveProfile();
  const supabase = createSupabaseAdminClient();
  const organizationId = getOrganizationId(profile.organization_id);

  const eventId = String(formData.get("event_id") ?? "");
  const sectionId = String(formData.get("section_id") ?? "");
  const participationId = String(formData.get("participation_id") ?? "");
  const query = nullableText(formData.get("q")) ?? undefined;

  if (!eventId || !sectionId || !participationId) {
    redirect("/events");
  }

  const [eventResult, sectionResult, participationResult] = await Promise.all([
    supabase.from("events").select("id").eq("id", eventId).eq("organization_id", organizationId).maybeSingle(),
    supabase.from("event_sections").select("id,event_id").eq("id", sectionId).maybeSingle(),
    supabase
      .from("participations")
      .select("id,event_id,organization_id")
      .eq("id", participationId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  if (!eventResult.data || !sectionResult.data || !participationResult.data) {
    redirect("/events");
  }

  if (sectionResult.data.event_id !== eventId || participationResult.data.event_id !== eventId) {
    redirect(buildEventUrl(eventId, { panel: "section_members", section_id: sectionId, error: "section_participation_invalid", q: query }));
  }

  const untypedSupabase = supabase as unknown as {
    from: (table: "participation_sections") => {
      delete: () => {
        eq: (column: "section_id", value: string) => {
          eq: (column: "participation_id", value: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
  };

  const deleteResult = await untypedSupabase
    .from("participation_sections")
    .delete()
    .eq("section_id", sectionId)
    .eq("participation_id", participationId);

  if (deleteResult.error) {
    redirect(buildEventUrl(eventId, { panel: "section_members", section_id: sectionId, error: "section_participation_delete_failed", q: query }));
  }

  invalidateCacheTags([cacheTags.events, cacheTags.event(eventId), cacheTags.participations]);
  redirect(buildEventUrl(eventId, { panel: "section_members", section_id: sectionId, notice: "section_participation_removed", q: query }));
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
