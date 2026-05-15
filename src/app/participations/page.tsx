/* eslint-disable @next/next/no-img-element -- Small CRM table logos intentionally use native lazy-loaded images. */
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPageParam, getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 30;

const PAGE_SIZE = 50;

type ParticipationListRow = Database["public"]["Views"]["participation_list_view"]["Row"];
type EventRow = Pick<Database["public"]["Tables"]["events"]["Row"], "id" | "event_name">;

export default async function ParticipationsPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  const page = getPageParam(params);
  const query = getStringParam(params, "q")?.trim() ?? "";
  const status = getStringParam(params, "status")?.trim() ?? "";
  const eventId = getStringParam(params, "event_id")?.trim() ?? "";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

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

  const participations = data ?? [];
  const events = (eventsData ?? []) as EventRow[];

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
          total={count ?? 0}
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

function ParticipationRow({ participation }: { participation: ParticipationListRow }) {
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
            <Link href={`/companies/${participation.company_id}`} className="truncate font-medium hover:text-primary">
              {participation.company_name}
            </Link>
            <div className="truncate text-xs text-muted-foreground">
              {participation.package_name ?? "No package"}
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
