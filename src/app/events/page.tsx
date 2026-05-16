import Link from "next/link";
import { CalendarDays, MapPin, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPageParam, getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 30;

const PAGE_SIZE = 50;

type Event = Database["public"]["Tables"]["events"]["Row"];
type Participation = Pick<Database["public"]["Tables"]["participations"]["Row"], "event_id" | "id" | "status">;

export default async function EventsPage({ searchParams }: { searchParams?: Promise<PageSearchParams> }) {
  const params = await resolveSearchParams(searchParams);
  const { profile } = await requireActiveProfile();

  const page = getPageParam(params);
  const query = getStringParam(params, "q")?.trim() ?? "";
  const status = getStringParam(params, "status")?.trim() ?? "";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { events, participations, count } = await loadCached(
    {
      keyParts: ["events", profile.organization_id, page, query, status],
      tags: [cacheTags.events, cacheTags.participations],
    },
    async () => {
      const supabase = createSupabaseAdminClient();
      let request = supabase
        .from("events")
        .select("*", { count: "exact" })
        .order("start_date", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (query) {
        request = request.or(`event_name.ilike.%${query}%,venue_name.ilike.%${query}%,city.ilike.%${query}%,country.ilike.%${query}%`);
      }

      if (status) {
        request = request.eq("status", status);
      }

      const { data, error, count } = await request;

      if (error) {
        throw new Error(error.message);
      }

      const events = (data ?? []) as Event[];
      const eventIds = events.map((event) => event.id);
      const participationsResult =
        eventIds.length > 0
          ? await supabase.from("participations").select("id,event_id,status").in("event_id", eventIds)
          : emptyResult<Participation[]>();

      if (participationsResult.error) {
        throw new Error(participationsResult.error.message);
      }

      return {
        events,
        participations: (participationsResult.data ?? []) as Participation[],
        count: count ?? 0,
      };
    },
  );
  const participationsByEvent = groupBy(participations, (participation) => participation.event_id);

  return (
    <AppShell title="Events">
      <form className="mb-4 grid gap-2 md:grid-cols-[1fr_180px_auto_auto]">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" aria-hidden="true" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search events"
            className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          name="status"
          defaultValue={status}
          className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Apply</button>
        {query || status ? (
          <Link href="/events" className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm">
            Reset
          </Link>
        ) : null}
      </form>

      {events.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {events.map((event) => {
            const participations = participationsByEvent.get(event.id) ?? [];
            const confirmed = participations.filter((participation) => participation.status === "confirmed").length;

            return (
              <Link key={event.id} href={`/events/${event.id}`} className="rounded-lg border border-border bg-white p-5 shadow-soft hover:border-primary">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-semibold text-primary">{event.event_name}</h2>
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={14} aria-hidden="true" />
                        {[event.start_date, event.end_date].filter(Boolean).join(" - ") || "No dates"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={14} aria-hidden="true" />
                        {[event.venue_name, event.city, event.country].filter(Boolean).join(", ") || "No venue"}
                      </span>
                    </div>
                  </div>
                  <StatusBadge value={event.status} />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <Metric label="Participants" value={participations.length} />
                  <Metric label="Confirmed" value={confirmed} />
                  <Metric label="Pending" value={participations.length - confirmed} />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white p-8 text-center text-sm text-muted-foreground shadow-soft">
          No events found.
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-lg border border-border bg-white shadow-soft">
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={count}
          basePath="/events"
          params={{ q: query || undefined, status: status || undefined }}
        />
      </div>
    </AppShell>
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

function groupBy<T>(rows: T[], getKey: (row: T) => string | null | undefined) {
  const map = new Map<string, T[]>();

  for (const row of rows) {
    const key = getKey(row);
    if (!key) {
      continue;
    }
    map.set(key, [...(map.get(key) ?? []), row]);
  }

  return map;
}

function emptyResult<T>(data: T = [] as T) {
  return { data, error: null };
}
