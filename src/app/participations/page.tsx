/* eslint-disable @next/next/no-img-element -- Small CRM table logos intentionally use native lazy-loaded images. */
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import {
  ParticipationSectionBadges,
  type ParticipationSection,
} from "@/components/participation-section-badges";
import { StatusBadge } from "@/components/status-badge";
import { CACHE_TTL } from "@/lib/cache/ttl";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPageParam, getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 3600;

const PAGE_SIZE = 50;

type ParticipationListRow = Database["public"]["Views"]["participation_list_view"]["Row"];
type EventRow = Pick<Database["public"]["Tables"]["events"]["Row"], "id" | "event_name">;

type ParticipationListItem = ParticipationListRow & {
  sections: ParticipationSection[];
};

type ParticipationSectionLinkRow = {
  participation_id: string;
  event_sections: {
    id: string;
    name: string;
    sort_order: number | null;
  } | null;
};

export default async function ParticipationsPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  const { profile } = await requireActiveProfile();
  const orgId = profile.organization_id ?? "";

  const page = getPageParam(params);
  const query = getStringParam(params, "q")?.trim() ?? "";
  const status = getStringParam(params, "status")?.trim() ?? "";
  const eventId = getStringParam(params, "event_id")?.trim() ?? "";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { participations, events, count } = await loadCached(
    {
      keyParts: ["participations", orgId, page, query, status, eventId],
      tags: [cacheTags.orgParticipations(orgId), cacheTags.orgEvents(orgId)],
      revalidateSeconds: CACHE_TTL.PARTICIPATIONS_MEDIUM,
    },
    async () => {
      const supabase = createSupabaseAdminClient();
      let request = supabase
        .from("participation_list_view")
        .select("*", { count: "exact" })
        .order("company_name", { ascending: true })
        .range(from, to);

      if (query) {
        request = request.ilike("company_name", `%${query}%`);
      }

      if (status) {
        request = request.eq("status", status);
      }

      if (eventId) {
        request = request.eq("event_id", eventId);
      }

      const [{ data, error, count }, { data: eventsData, error: eventsError }] = await Promise.all([
        request,
        supabase.from("events").select("id,event_name").order("event_name", { ascending: true }),
      ]);

      if (error) {
        throw new Error(error.message);
      }

      if (eventsError) {
        throw new Error(eventsError.message);
      }

      const participations = (data ?? []) as ParticipationListRow[];
      const participationIds = participations
        .map((participation) => participation.participation_id)
        .filter((participationId): participationId is string => Boolean(participationId));
      const sectionsByParticipation = await loadParticipationSections(supabase, participationIds);

      return {
        participations: participations.map((participation) => ({
          ...participation,
          sections: participation.participation_id
            ? (sectionsByParticipation.get(participation.participation_id) ?? [])
            : [],
        })),
        events: (eventsData ?? []) as EventRow[],
        count: count ?? 0,
      };
    },
  );

  return (
    <AppShell title="Participations">
      <form className="mb-4 grid gap-2 md:grid-cols-[1fr_180px_220px_auto_auto]">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search companies"
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          name="event_id"
          defaultValue={eventId}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">All events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.event_name}
            </option>
          ))}
        </select>
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Apply
        </button>
        {query || status || eventId ? (
          <Link
            href="/participations"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm"
          >
            Reset
          </Link>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-[30%] px-4 py-3 font-semibold">Company</th>
              <th className="w-[13%] px-4 py-3 font-semibold">Booth</th>
              <th className="w-[13%] px-4 py-3 font-semibold">Type</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Status</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Payment</th>
              <th className="w-[20%] px-4 py-3 font-semibold">Main contact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {participations.length > 0 ? (
              participations.map((participation) => (
                <ParticipationRow key={participation.participation_id} participation={participation} />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No participations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={count}
          basePath="/participations"
          params={{
            q: query || undefined,
            status: status || undefined,
            event_id: eventId || undefined,
          }}
        />
      </div>
    </AppShell>
  );
}

function ParticipationRow({ participation }: { participation: ParticipationListItem }) {
  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {participation.logo_url ? (
            <img
              src={participation.logo_url}
              alt=""
              loading="lazy"
              className="h-10 w-10 shrink-0 rounded-md border border-border object-contain"
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-md border border-border bg-muted" />
          )}
          <div className="min-w-0">
            <Link href={`/participations/${participation.participation_id}`} className="truncate font-medium hover:text-primary">
              {participation.company_name}
            </Link>
            <div className="mt-1">
              <ParticipationSectionBadges sections={participation.sections} eventId={participation.event_id} />
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-muted-foreground">{participation.booth_numbers || "No booth"}</td>
      <td className="px-4 py-4 text-muted-foreground">{participation.participation_type ?? "Not set"}</td>
      <td className="px-4 py-4">
        <StatusBadge value={participation.status} />
      </td>
      <td className="px-4 py-4">
        <StatusBadge value={participation.payment_status} />
      </td>
      <td className="px-4 py-4">
        <div className="truncate">{participation.main_contact_name || "No contact"}</div>
        <div className="truncate text-xs text-muted-foreground">{participation.main_contact_email ?? ""}</div>
      </td>
    </tr>
  );
}

async function loadParticipationSections(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  participationIds: string[],
) {
  const sectionsByParticipation = new Map<string, ParticipationSection[]>();

  if (participationIds.length === 0) {
    return sectionsByParticipation;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("participation_sections")
    .select("participation_id,event_sections(id,name,sort_order)")
    .in("participation_id", participationIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as ParticipationSectionLinkRow[]) {
    const section = row.event_sections;
    if (!section?.id || !section.name) {
      continue;
    }

    const participationSections = sectionsByParticipation.get(row.participation_id) ?? [];
    participationSections.push({ id: section.id, name: section.name });
    sectionsByParticipation.set(row.participation_id, participationSections);
  }

  const sortOrderBySectionId = new Map<string, number | null>();
  for (const row of (data ?? []) as ParticipationSectionLinkRow[]) {
    if (row.event_sections?.id) {
      sortOrderBySectionId.set(row.event_sections.id, row.event_sections.sort_order);
    }
  }

  for (const sections of sectionsByParticipation.values()) {
    sections.sort((left, right) => {
      const leftOrder = sortOrderBySectionId.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = sortOrderBySectionId.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.name.localeCompare(right.name);
    });
  }

  return sectionsByParticipation;
}
