/* eslint-disable @next/next/no-img-element -- Small CRM table logos intentionally use native lazy-loaded images. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardList, Map, Pencil, Plus, Settings } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { CACHE_TTL } from "@/lib/cache/ttl";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { saveEventProgramItem, saveEventSection, updateEventDetails } from "./actions";
import { DeleteEventButton } from "./delete-event-button";
import { DeleteProgramItemButton } from "./delete-program-item-button";
import { DeleteSectionButton } from "./delete-section-button";
import { SectionMembersModal } from "./section-members-modal";
import { SlugGenerateField } from "./slug-generate-field";

export const revalidate = 3600;

type Event = Database["public"]["Tables"]["events"]["Row"];
type ParticipationRow = Database["public"]["Views"]["participation_list_view"]["Row"];
type EventAction = Database["public"]["Views"]["event_action_list_view"]["Row"];
type Section = Database["public"]["Tables"]["event_sections"]["Row"];
type ProgramItem = Database["public"]["Tables"]["event_program_items"]["Row"];
type ParticipationSectionLinkRow = { participation_id: string; section_id: string };

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const { profile } = await requireActiveProfile();
  const orgId = profile.organization_id;
  if (!orgId) {
    notFound();
  }
  const isEditing = getStringParam(resolvedSearchParams, "edit") === "1";
  const panel = getStringParam(resolvedSearchParams, "panel");
  const sectionFilterId = getStringParam(resolvedSearchParams, "section");
  const sectionId = getStringParam(resolvedSearchParams, "section_id");
  const itemId = getStringParam(resolvedSearchParams, "item_id");
  const notice = getStringParam(resolvedSearchParams, "notice");
  const error = getStringParam(resolvedSearchParams, "error");

  const { event, participations, allEventParticipations, actions, sections, program, totalParticipations, totalConfirmedParticipations, participationSections } = await loadCached(
    {
      keyParts: ["event-detail", orgId, id],
      tags: [
        cacheTags.orgEvents(orgId),
        cacheTags.eventDetail(id),
        cacheTags.orgParticipations(orgId),
        cacheTags.orgActions(orgId),
      ],
      revalidateSeconds: CACHE_TTL.DETAIL_LONG,
    },
    async () => {
      const supabase = createSupabaseAdminClient();
      const untypedSupabase = supabase as unknown as {
        from: (table: "participation_sections") => {
          select: (columns: "participation_id") => {
            eq: (column: "section_id", value: string) => Promise<{ data: Array<{ participation_id: string }> | null }>;
          };
        };
      };
      const scopedParticipationIds =
        sectionFilterId
          ? ((await untypedSupabase.from("participation_sections").select("participation_id").eq("section_id", sectionFilterId)).data ?? []).map(
              (row: { participation_id: string }) => row.participation_id,
            )
          : null;

      const participationsRequest = supabase
        .from("participation_list_view")
        .select("*")
        .eq("event_id", id)
        .order("company_name", { ascending: true })
        .limit(8);

      const scopedParticipationsRequest =
        scopedParticipationIds && scopedParticipationIds.length > 0
          ? participationsRequest.in("participation_id", scopedParticipationIds)
          : scopedParticipationIds
            ? supabase.from("participation_list_view").select("*").eq("event_id", id).in("participation_id", ["00000000-0000-0000-0000-000000000000"])
            : participationsRequest;

      const [eventResult, participationsResult, allParticipationsResult, actionsResult, sectionsResult, programResult, totalParticipationsResult, totalConfirmedParticipationsResult] =
        await Promise.all([
        supabase.from("events").select("*").eq("id", id).single(),
        scopedParticipationsRequest,
        supabase
          .from("participation_list_view")
          .select("*")
          .eq("event_id", id)
          .order("company_name", { ascending: true }),
        supabase
          .from("event_action_list_view")
          .select("*")
          .eq("event_id", id)
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(8),
        supabase.from("event_sections").select("*").eq("event_id", id).order("sort_order", { ascending: true }),
        supabase
          .from("event_program_items")
          .select("*")
          .eq("event_id", id)
          .order("starts_at", { ascending: true, nullsFirst: false }),
        scopedParticipationIds
          ? scopedParticipationIds.length > 0
            ? supabase
                .from("participations")
                .select("id", { count: "exact", head: true })
                .eq("organization_id", orgId)
                .eq("event_id", id)
                .in("id", scopedParticipationIds)
            : emptyCountResult()
          : supabase
              .from("participations")
              .select("id", { count: "exact", head: true })
              .eq("organization_id", orgId)
              .eq("event_id", id),
        scopedParticipationIds
          ? scopedParticipationIds.length > 0
            ? supabase
                .from("participations")
                .select("id", { count: "exact", head: true })
                .eq("organization_id", orgId)
                .eq("event_id", id)
                .eq("status", "confirmed")
                .in("id", scopedParticipationIds)
            : emptyCountResult()
          : supabase
              .from("participations")
              .select("id", { count: "exact", head: true })
              .eq("organization_id", orgId)
              .eq("event_id", id)
              .eq("status", "confirmed"),
        ]);

      const participationSectionsSupabase = supabase as unknown as {
        from: (table: "participation_sections") => {
          select: (columns: "participation_id,section_id") => {
            in: (column: "section_id", values: string[]) => Promise<{ data: ParticipationSectionLinkRow[] | null; error: { message: string } | null }>;
          };
        };
      };
      const sectionIds = (sectionsResult.data ?? []).map((section: Section) => section.id);
      const participationSectionsResult =
        sectionIds.length > 0
          ? await participationSectionsSupabase.from("participation_sections").select("participation_id,section_id").in("section_id", sectionIds)
          : { data: [] as ParticipationSectionLinkRow[], error: null };

      if (eventResult.error) {
        if (eventResult.error.code === "PGRST116") {
          notFound();
        }

        throw new Error(eventResult.error.message);
      }

      const firstError =
        participationsResult.error ??
        allParticipationsResult.error ??
        actionsResult.error ??
        sectionsResult.error ??
        programResult.error ??
        totalParticipationsResult.error ??
        totalConfirmedParticipationsResult.error ??
        participationSectionsResult.error;

      if (firstError) {
        throw new Error(firstError.message);
      }

      return {
        event: eventResult.data as Event,
        participations: (participationsResult.data ?? []) as ParticipationRow[],
        allEventParticipations: (allParticipationsResult.data ?? []) as ParticipationRow[],
        actions: (actionsResult.data ?? []) as EventAction[],
        sections: (sectionsResult.data ?? []) as Section[],
        program: (programResult.data ?? []) as ProgramItem[],
        totalParticipations: totalParticipationsResult.count ?? 0,
        totalConfirmedParticipations: totalConfirmedParticipationsResult.count ?? 0,
        participationSections: (participationSectionsResult.data ?? []) as ParticipationSectionLinkRow[],
      };
    },
  );
  const selectedSection = sectionId ? sections.find((section) => section.id === sectionId) ?? null : null;
  const selectedProgramItem = itemId ? program.find((item) => item.id === itemId) ?? null : null;
  const sectionMemberParticipants = allEventParticipations
    .filter((participation): participation is ParticipationRow & { participation_id: string; company_name: string } =>
      Boolean(participation.participation_id && participation.company_name),
    )
    .map((participation) => ({
      participationId: participation.participation_id,
      companyName: participation.company_name,
      boothNumbers: participation.booth_numbers,
    }));
  const initialSectionAssignedIds = selectedSection
    ? participationSections
        .filter((link) => link.section_id === selectedSection.id)
        .map((link) => link.participation_id)
    : [];

  return (
    <AppShell title="Event Detail">
      <div className="space-y-6">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to events
        </Link>

        {notice || error ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {getFlashMessage(notice ?? null, error ?? null)}
          </div>
        ) : null}

        {isEditing ? (
          <section className="rounded-lg border border-border bg-white p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-primary">Edit event</h3>
              <Link href={`/events/${event.id}`} className="text-sm font-medium text-primary hover:underline">
                Close
              </Link>
            </div>
            <form action={updateEventDetails} className="space-y-4">
              <input type="hidden" name="event_id" value={event.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Event name" name="event_name" defaultValue={event.event_name ?? ""} required />
                <SelectField
                  label="Status"
                  name="status"
                  defaultValue={event.status ?? "planning"}
                  options={[
                    { value: "planning", label: "Planning" },
                    { value: "active", label: "Active" },
                    { value: "completed", label: "Completed" },
                    { value: "cancelled", label: "Cancelled" },
                  ]}
                />
                <Field label="Venue" name="venue_name" defaultValue={event.venue_name ?? ""} />
                <Field label="City" name="city" defaultValue={event.city ?? ""} />
                <Field label="Country" name="country" defaultValue={event.country ?? ""} />
                <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
                  <Field label="Start date" name="start_date" type="date" defaultValue={event.start_date ?? ""} />
                  <Field label="End date" name="end_date" type="date" defaultValue={event.end_date ?? ""} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Save event
                </button>
                <Link href={`/events/${event.id}`} className="text-sm font-medium text-muted-foreground hover:text-primary">
                  Cancel
                </Link>
              </div>
            </form>
          </section>
        ) : null}

        <section className="rounded-lg border border-border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Events</div>
              <h2 className="truncate text-3xl font-bold text-primary">{event.event_name}</h2>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>{[event.venue_name, event.city, event.country].filter(Boolean).join(", ") || "No venue"}</span>
                <span>{[event.start_date, event.end_date].filter(Boolean).join(" - ") || "No dates"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge value={event.status} />
              <Link
                href={`/events/${event.id}?edit=1`}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-white px-3 text-sm font-medium text-primary hover:bg-muted"
              >
                <Pencil size={14} aria-hidden="true" />
                Edit Event
              </Link>
              <DeleteEventButton eventId={event.id} />
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Panel
              title="Administrative Action Tracker"
              icon={<ClipboardList size={18} aria-hidden="true" />}
              action={
                <button disabled className="inline-flex cursor-not-allowed items-center gap-1 text-xs font-semibold text-primary opacity-50">
                  <Plus size={14} aria-hidden="true" />
                  New action
                </button>
              }
            >
              {actions.length > 0 ? (
                <div className="space-y-2">
                  {actions.map((action) => (
                    <div key={action.action_id} className="flex items-center justify-between gap-3 rounded-lg bg-muted p-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-primary">{action.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {action.due_date ? `Deadline: ${action.due_date}` : action.action_type ?? "No due date"}
                        </div>
                      </div>
                      <StatusBadge value={action.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyText>No event actions yet.</EmptyText>
              )}
            </Panel>

            <Panel title={`Participating Exhibitors (${totalParticipations})`} icon={<CalendarDays size={18} aria-hidden="true" />}>
              {participations.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead className="bg-muted text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="w-[38%] px-3 py-2">Company</th>
                        <th className="w-[20%] px-3 py-2">Booth</th>
                        <th className="w-[18%] px-3 py-2">Type</th>
                        <th className="w-[14%] px-3 py-2">Status</th>
                        <th className="w-[10%] px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {participations.map((participation) => (
                        <tr key={participation.participation_id}>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {participation.logo_url ? (
                                <img src={participation.logo_url} alt="" loading="lazy" className="h-8 w-8 rounded-md border border-border object-contain" />
                              ) : (
                                <div className="h-8 w-8 rounded-md bg-muted" />
                              )}
                              <Link href={`/participations/${participation.participation_id}`} className="truncate font-medium text-primary hover:underline">
                                {participation.company_name}
                              </Link>
                            </div>
                          </td>
                          <td className="truncate px-3 py-3 text-muted-foreground">{participation.booth_numbers || "No booth"}</td>
                          <td className="truncate px-3 py-3 text-muted-foreground">{participation.participation_type ?? "Not set"}</td>
                          <td className="px-3 py-3">
                            <StatusBadge value={participation.status} />
                          </td>
                          <td className="px-3 py-3">
                            <Link href={`/participations/${participation.participation_id}`} className="text-xs font-semibold text-primary hover:underline">
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t border-border bg-muted/50 px-3 py-2 text-center text-xs">
                    <Link href={`/participations?event_id=${event.id}`} className="font-semibold text-primary hover:underline">
                      View all exhibitors
                    </Link>
                  </div>
                </div>
              ) : (
                <EmptyText>No participants yet.</EmptyText>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Exhibition Map" icon={<Map size={18} aria-hidden="true" />}>
              <div className="aspect-[4/3] rounded-lg border border-border bg-primary p-4 text-primary-foreground">
                <div className="h-full rounded-md border border-white/20 bg-[linear-gradient(to_right,rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.12)_1px,transparent_1px)] bg-[size:28px_28px]" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <Metric label="Participants" value={totalParticipations} />
                <Metric label="Confirmed" value={totalConfirmedParticipations} />
              </div>
            </Panel>

            <Panel title="Sections" icon={<Settings size={18} aria-hidden="true" />}>
              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                <Link
                  href={`/events/${event.id}`}
                  className={`rounded-md border px-2 py-1 font-semibold ${
                    sectionFilterId ? "border-border text-muted-foreground hover:bg-muted" : "border-primary text-primary"
                  }`}
                >
                  All participants
                </Link>
                {sections.map((section) => (
                  <Link
                    key={`filter-${section.id}`}
                    href={`/events/${event.id}?section=${section.id}`}
                    className={`rounded-md border px-2 py-1 font-semibold ${
                      sectionFilterId === section.id ? "border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {section.name}
                  </Link>
                ))}
              </div>
              {panel === "section_members" && selectedSection ? (
                <SectionMembersModal
                  eventId={event.id}
                  sectionId={selectedSection.id}
                  sectionName={selectedSection.name}
                  participants={sectionMemberParticipants}
                  initialAssignedIds={initialSectionAssignedIds}
                />
              ) : null}
              {panel === "section" ? (
                <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
                  <form action={saveEventSection} className="space-y-3">
                    <input type="hidden" name="event_id" value={event.id} />
                    <input type="hidden" name="section_id" value={selectedSection?.id ?? ""} />
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-primary">Name</span>
                      <input
                        id="event-section-name"
                        name="name"
                        defaultValue={selectedSection?.name ?? ""}
                        required
                        className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
                      />
                    </label>
                    <SlugGenerateField
                      name="slug"
                      sourceValue={selectedSection?.name ?? ""}
                      sourceInputId="event-section-name"
                      defaultValue={selectedSection?.slug ?? ""}
                      label="Slug"
                    />
                    <Field label="Sort order" name="sort_order" type="number" defaultValue={String(selectedSection?.sort_order ?? 0)} />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
                      >
                        {selectedSection ? "Save section" : "Add section"}
                      </button>
                      <Link href={`/events/${event.id}`} className="text-sm font-medium text-muted-foreground hover:text-primary">
                        Cancel
                      </Link>
                    </div>
                  </form>
                </div>
              ) : null}
              {sections.length > 0 ? (
                <div className="space-y-2">
                  {sections.map((section) => (
                    <div key={section.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-primary">{section.name}</div>
                          <div className="text-xs text-muted-foreground">{section.slug ?? `Order ${section.sort_order ?? 0}`}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link href={`/events/${event.id}?panel=section&section_id=${section.id}`} className="text-xs font-semibold text-primary hover:underline">
                            Edit
                          </Link>
                          <Link href={`/events/${event.id}?panel=section_members&section_id=${section.id}`} className="text-xs font-semibold text-primary hover:underline">
                            Members
                          </Link>
                          <DeleteSectionButton eventId={event.id} sectionId={section.id} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyText>No sections configured.</EmptyText>
              )}
              <div className="mt-3">
                <Link href={`/events/${event.id}?panel=section`} className="text-xs font-semibold text-primary hover:underline">
                  + Add section
                </Link>
              </div>
            </Panel>

            <Panel title="Conferences" icon={<CalendarDays size={18} aria-hidden="true" />}>
              {panel === "program" ? (
                <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
                  <form action={saveEventProgramItem} className="space-y-3">
                    <input type="hidden" name="event_id" value={event.id} />
                    <input type="hidden" name="item_id" value={selectedProgramItem?.id ?? ""} />
                    <Field label="Title" name="title" defaultValue={selectedProgramItem?.title ?? ""} required />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Type" name="item_type" defaultValue={selectedProgramItem?.item_type ?? ""} />
                      <Field label="Venue" name="venue" defaultValue={selectedProgramItem?.venue ?? ""} />
                      <Field label="Status" name="status" defaultValue={selectedProgramItem?.status ?? ""} />
                      <SelectField
                        label="Section"
                        name="section_id"
                        defaultValue={selectedProgramItem?.section_id ?? ""}
                        options={[
                          { value: "", label: "No section" },
                          ...sections.map((section) => ({ value: section.id, label: section.name })),
                        ]}
                      />
                      <Field
                        label="Starts at"
                        name="starts_at"
                        type="datetime-local"
                        defaultValue={toLocalDateTime(selectedProgramItem?.starts_at)}
                      />
                      <Field label="Ends at" name="ends_at" type="datetime-local" defaultValue={toLocalDateTime(selectedProgramItem?.ends_at)} />
                    </div>
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium text-primary">Description</span>
                      <textarea
                        name="description"
                        defaultValue={selectedProgramItem?.description ?? ""}
                        rows={3}
                        className="rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground"
                      >
                        {selectedProgramItem ? "Save item" : "Add item"}
                      </button>
                      <Link href={`/events/${event.id}`} className="text-sm font-medium text-muted-foreground hover:text-primary">
                        Cancel
                      </Link>
                    </div>
                  </form>
                </div>
              ) : null}
              {program.length > 0 ? (
                <div className="space-y-3">
                  {program.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">{item.starts_at ? formatDateTime(item.starts_at) : item.item_type ?? "Program"}</div>
                          <div className="mt-1 font-semibold text-primary">{item.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{item.venue ?? item.status ?? "No venue"}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Link href={`/events/${event.id}?panel=program&item_id=${item.id}`} className="text-xs font-semibold text-primary hover:underline">
                            Edit
                          </Link>
                          <DeleteProgramItemButton eventId={event.id} itemId={item.id} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyText>No program items yet.</EmptyText>
              )}
              <div className="mt-3">
                <Link href={`/events/${event.id}?panel=program`} className="text-xs font-semibold text-primary hover:underline">
                  + Add conference item
                </Link>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      <div className="rounded-lg border border-border bg-white p-4 shadow-soft">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-primary">{value}</div>
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getFlashMessage(notice: string | null, error: string | null) {
  if (error === "event_name_required") {
    return "Event name is required.";
  }
  if (error === "event_update_failed") {
    return "Could not save event details. Try again.";
  }
  if (error === "event_delete_blocked_participations") {
    return "Cannot delete event with participating exhibitors. Remove participations first.";
  }
  if (error === "event_delete_failed") {
    return "Could not delete event. Try again.";
  }
  if (error === "section_name_required") {
    return "Section name is required.";
  }
  if (error === "section_save_failed") {
    return "Could not save section.";
  }
  if (error === "section_delete_failed") {
    return "Could not delete section.";
  }
  if (error === "section_delete_blocked_program_items") {
    return "Cannot delete section while it is used by conference items. Reassign or delete those items first.";
  }
  if (error === "program_title_required") {
    return "Program title is required.";
  }
  if (error === "program_save_failed") {
    return "Could not save program item.";
  }
  if (error === "program_delete_failed") {
    return "Could not delete program item.";
  }
  if (error === "section_participation_invalid") {
    return "Section and participant must belong to the same event.";
  }
  if (error === "section_participation_save_failed") {
    return "Could not add participant to section.";
  }
  if (error === "section_participation_delete_failed") {
    return "Could not remove participant from section.";
  }
  if (notice === "event_saved") {
    return "Event details updated.";
  }
  if (notice === "event_created") {
    return "Event created.";
  }
  if (notice === "section_created") {
    return "Section created.";
  }
  if (notice === "section_updated") {
    return "Section updated.";
  }
  if (notice === "section_deleted") {
    return "Section deleted.";
  }
  if (notice === "program_created") {
    return "Program item created.";
  }
  if (notice === "program_updated") {
    return "Program item updated.";
  }
  if (notice === "program_deleted") {
    return "Program item deleted.";
  }
  if (notice === "section_participation_added") {
    return "Participant added to section.";
  }
  if (notice === "section_participation_removed") {
    return "Participant removed from section.";
  }
  if (notice === "section_participations_saved") {
    return "Section participants updated.";
  }

  return error ? "Could not update event." : "Saved.";
}

function toLocalDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyCountResult() {
  return { count: 0, error: null };
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-primary">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-primary">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
