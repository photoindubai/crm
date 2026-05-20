/* eslint-disable @next/next/no-img-element -- Small CRM table logos intentionally use native lazy-loaded images. */
import Link from "next/link";
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

type Company = Pick<
  Database["public"]["Tables"]["companies"]["Row"],
  "id" | "company_name" | "company_logo_url" | "website"
>;

type ParticipationWithEvent = Pick<
  Database["public"]["Tables"]["participations"]["Row"],
  "id" | "company_id" | "status" | "event_id"
> & {
  events: Pick<Database["public"]["Tables"]["events"]["Row"], "id" | "event_name"> | null;
};

type ContactLink = Pick<Database["public"]["Tables"]["company_contacts"]["Row"], "company_id" | "is_primary" | "created_at"> & {
  contacts: Pick<
    Database["public"]["Tables"]["contacts"]["Row"],
    "first_name" | "last_name" | "email" | "phone" | "created_at"
  > | null;
};

type CompanyEvent = {
  eventId: string;
  eventName: string;
};

type CompanyListItem = {
  company_id: string;
  company_name: string;
  logo_url: string | null;
  website: string | null;
  main_contact_name: string | null;
  main_contact_email: string | null;
  main_contact_phone: string | null;
  participation_status: string | null;
  events: CompanyEvent[];
};

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  const { profile } = await requireActiveProfile();

  const page = getPageParam(params);
  const query = getStringParam(params, "q")?.trim() ?? "";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { companies, count } = await loadCached(
    {
      keyParts: ["companies", profile.organization_id, page, query],
      tags: [cacheTags.companies, cacheTags.participations, cacheTags.events],
    },
    async () => {
      const supabase = createSupabaseAdminClient();
      let request = supabase
        .from("companies")
        .select("id,company_name,company_logo_url,website", { count: "exact" })
        .order("company_name", { ascending: true })
        .range(from, to);

      if (query) {
        request = request.ilike("company_name", `%${query}%`);
      }

      const { data, error, count } = await request;

      if (error) {
        throw new Error(error.message);
      }

      const companies = (data ?? []) as Company[];
      const companyIds = companies.map((company) => company.id);

      const [participationsResult, contactLinksResult] =
        companyIds.length > 0
          ? await Promise.all([
              supabase
                .from("participations")
                .select("id,company_id,status,event_id,events(id,event_name)")
                .in("company_id", companyIds)
                .order("created_at", { ascending: false }),
              supabase
                .from("company_contacts")
                .select("company_id,is_primary,created_at,contacts(first_name,last_name,email,phone,created_at)")
                .in("company_id", companyIds),
            ])
          : [emptyResult<ParticipationWithEvent[]>(), emptyResult<ContactLink[]>()];

      if (participationsResult.error) {
        throw new Error(participationsResult.error.message);
      }

      if (contactLinksResult.error) {
        throw new Error(contactLinksResult.error.message);
      }

      const eventsByCompany = buildEventsByCompany((participationsResult.data ?? []) as ParticipationWithEvent[]);
      const statusByCompany = buildStatusByCompany((participationsResult.data ?? []) as ParticipationWithEvent[]);
      const primaryContactByCompany = buildPrimaryContactByCompany((contactLinksResult.data ?? []) as ContactLink[]);

      return {
        companies: companies.map((company) => {
          const primaryContact = primaryContactByCompany.get(company.id);

          return {
            company_id: company.id,
            company_name: company.company_name,
            logo_url: company.company_logo_url,
            website: company.website,
            main_contact_name: primaryContact?.name ?? null,
            main_contact_email: primaryContact?.email ?? null,
            main_contact_phone: primaryContact?.phone ?? null,
            participation_status: statusByCompany.get(company.id) ?? null,
            events: eventsByCompany.get(company.id) ?? [],
          };
        }),
        count: count ?? 0,
      };
    },
  );

  return (
    <AppShell title="Companies">
      <form className="mb-4 flex max-w-xl gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search companies"
          className="h-10 flex-1 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
        />
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Search
        </button>
        {query ? (
          <Link href="/companies" className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm">
            Reset
          </Link>
        ) : null}
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-[32%] px-4 py-3 font-semibold">Company</th>
              <th className="w-[18%] px-4 py-3 font-semibold">Events</th>
              <th className="w-[24%] px-4 py-3 font-semibold">Main contact</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Status</th>
              <th className="w-[14%] px-4 py-3 font-semibold">Website</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {companies.length > 0 ? (
              companies.map((company) => <CompanyRow key={company.company_id} company={company} />)
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No companies found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={count}
          basePath="/companies"
          params={{ q: query || undefined }}
        />
      </div>
    </AppShell>
  );
}

function CompanyRow({ company }: { company: CompanyListItem }) {
  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {company.logo_url ? (
            <img
              src={company.logo_url}
              alt=""
              loading="lazy"
              className="h-10 w-10 shrink-0 rounded-md border border-border object-contain"
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-md border border-border bg-muted" />
          )}
          <div className="min-w-0">
            <Link href={`/companies/${company.company_id}`} className="truncate font-medium hover:text-primary">
              {company.company_name}
            </Link>
            <div className="truncate text-xs text-muted-foreground">{company.main_contact_email ?? ""}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        {company.events.length > 0 ? (
          <ul className="space-y-1">
            {company.events.map((event) => (
              <li key={event.eventId}>
                <Link href={`/events/${event.eventId}`} className="text-primary hover:underline">
                  {event.eventName}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-muted-foreground">No events</span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="truncate">{company.main_contact_name || "No contact"}</div>
        <div className="truncate text-xs text-muted-foreground">
          {company.main_contact_email ?? company.main_contact_phone ?? ""}
        </div>
      </td>
      <td className="px-4 py-4">
        <StatusBadge value={company.participation_status} />
      </td>
      <td className="px-4 py-4">
        {company.website ? (
          <a href={company.website} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
            {company.website.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <span className="text-muted-foreground">No website</span>
        )}
      </td>
    </tr>
  );
}

function emptyResult<T>(): { data: T; error: null } {
  return { data: [] as T, error: null };
}

function buildEventsByCompany(participations: ParticipationWithEvent[]) {
  const eventsByCompany = new Map<string, CompanyEvent[]>();
  const seenEventIdsByCompany = new Map<string, Set<string>>();

  for (const participation of participations) {
    const companyId = participation.company_id;
    const event = participation.events;

    if (!companyId || !event?.id || !event.event_name) {
      continue;
    }

    const seenEventIds = seenEventIdsByCompany.get(companyId) ?? new Set<string>();
    if (seenEventIds.has(event.id)) {
      continue;
    }

    seenEventIds.add(event.id);
    seenEventIdsByCompany.set(companyId, seenEventIds);

    const companyEvents = eventsByCompany.get(companyId) ?? [];
    companyEvents.push({ eventId: event.id, eventName: event.event_name });
    eventsByCompany.set(companyId, companyEvents);
  }

  for (const events of eventsByCompany.values()) {
    events.sort((left, right) => left.eventName.localeCompare(right.eventName));
  }

  return eventsByCompany;
}

function buildStatusByCompany(participations: ParticipationWithEvent[]) {
  const statusByCompany = new Map<string, string | null>();

  for (const participation of participations) {
    if (!participation.company_id || statusByCompany.has(participation.company_id)) {
      continue;
    }

    statusByCompany.set(participation.company_id, participation.status);
  }

  return statusByCompany;
}

function buildPrimaryContactByCompany(links: ContactLink[]) {
  const rankedLinks = [...links].sort((left, right) => compareContactLinks(left, right));
  const primaryContactByCompany = new Map<string, { name: string | null; email: string | null; phone: string | null }>();

  for (const link of rankedLinks) {
    if (!link.company_id || primaryContactByCompany.has(link.company_id) || !link.contacts) {
      continue;
    }

    primaryContactByCompany.set(link.company_id, {
      name: [link.contacts.first_name, link.contacts.last_name].filter(Boolean).join(" ") || null,
      email: link.contacts.email,
      phone: link.contacts.phone,
    });
  }

  return primaryContactByCompany;
}

function compareContactLinks(left: ContactLink, right: ContactLink) {
  const primaryScore = Number(Boolean(right.is_primary)) - Number(Boolean(left.is_primary));
  if (primaryScore !== 0) {
    return primaryScore;
  }

  const createdAtScore = compareNullableDates(left.created_at, right.created_at);
  if (createdAtScore !== 0) {
    return createdAtScore;
  }

  return compareNullableDates(left.contacts?.created_at, right.contacts?.created_at);
}

function compareNullableDates(left: string | null | undefined, right: string | null | undefined) {
  const leftTime = left ? Date.parse(left) : Number.POSITIVE_INFINITY;
  const rightTime = right ? Date.parse(right) : Number.POSITIVE_INFINITY;
  return leftTime - rightTime;
}
