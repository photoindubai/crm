import "server-only";

import { CACHE_TTL } from "@/lib/cache/ttl";
import { cacheTags } from "@/lib/cache-tags";
import {
  CLIENT_CACHE_INELIGIBLE_MESSAGE,
  MAX_CLIENT_LIST_ROWS,
} from "@/lib/query/limits";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  CompaniesClientListResult,
  CompaniesPaginatedResult,
  CompanyListItem,
  CompanyRow,
  ContactLink,
  ParticipationWithEvent,
} from "@/lib/loaders/companies-list.types";
import { COMPANIES_PAGE_SIZE } from "@/lib/loaders/companies-list.types";

type PaginatedOptions = {
  page: number;
  query: string;
  mine: boolean;
  userId: string;
};

export async function loadCompaniesClientList(orgId: string): Promise<CompaniesClientListResult> {
  if (!orgId) {
    return { companies: [], total: 0, clientCacheEligible: false };
  }

  return loadCached(
    {
      keyParts: ["companies-client", orgId],
      tags: [cacheTags.orgCompanies(orgId), cacheTags.orgParticipations(orgId), cacheTags.orgEvents(orgId)],
      revalidateSeconds: CACHE_TTL.LIST_LONG,
    },
    () => fetchCompaniesClientList(orgId),
  );
}

export async function loadCompaniesPaginated(
  orgId: string,
  options: PaginatedOptions,
): Promise<CompaniesPaginatedResult> {
  const { page, query, mine, userId } = options;
  const from = (page - 1) * COMPANIES_PAGE_SIZE;
  const to = from + COMPANIES_PAGE_SIZE - 1;

  return loadCached(
    {
      keyParts: ["companies", orgId, page, query, mine ? `mine:${userId}` : "all"],
      tags: [cacheTags.orgCompanies(orgId), cacheTags.orgParticipations(orgId), cacheTags.orgEvents(orgId)],
      revalidateSeconds: CACHE_TTL.LIST_LONG,
    },
    async () => {
      const supabase = createSupabaseAdminClient();
      let request = supabase
        .from("companies")
        .select("id,company_name,company_logo_url,website,owner_id", { count: "exact" })
        .eq("organization_id", orgId)
        .order("company_name", { ascending: true })
        .range(from, to);

      if (query) {
        request = request.ilike("company_name", `%${query}%`);
      }

      if (mine) {
        request = request.eq("owner_id", userId);
      }

      const { data, error, count } = await request;

      if (error) {
        throw new Error(error.message);
      }

      const companies = await enrichCompanies((data ?? []) as CompanyRow[]);

      return {
        companies,
        count: count ?? 0,
      };
    },
  );
}

async function fetchCompaniesClientList(orgId: string): Promise<CompaniesClientListResult> {
  const supabase = createSupabaseAdminClient();

  const { count, error: countError } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if (countError) {
    throw new Error(countError.message);
  }

  const total = count ?? 0;

  if (total > MAX_CLIENT_LIST_ROWS) {
    return {
      companies: [],
      total,
      clientCacheEligible: false,
      message: CLIENT_CACHE_INELIGIBLE_MESSAGE,
    };
  }

  const { data, error } = await supabase
    .from("companies")
    .select("id,company_name,company_logo_url,website,owner_id")
    .eq("organization_id", orgId)
    .order("company_name", { ascending: true })
    .limit(MAX_CLIENT_LIST_ROWS);

  if (error) {
    throw new Error(error.message);
  }

  const companies = await enrichCompanies((data ?? []) as CompanyRow[]);

  return {
    companies,
    total,
    clientCacheEligible: true,
  };
}

async function enrichCompanies(companies: CompanyRow[]): Promise<CompanyListItem[]> {
  const companyIds = companies.map((company) => company.id);

  if (companyIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();

  const [participationsResult, contactLinksResult] = await Promise.all([
    supabase
      .from("participations")
      .select("id,company_id,status,event_id,events(id,event_name)")
      .in("company_id", companyIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("company_contacts")
      .select("company_id,is_primary,created_at,contacts(first_name,last_name,email,phone,created_at)")
      .in("company_id", companyIds),
  ]);

  if (participationsResult.error) {
    throw new Error(participationsResult.error.message);
  }

  if (contactLinksResult.error) {
    throw new Error(contactLinksResult.error.message);
  }

  const eventsByCompany = buildEventsByCompany((participationsResult.data ?? []) as ParticipationWithEvent[]);
  const statusByCompany = buildStatusByCompany((participationsResult.data ?? []) as ParticipationWithEvent[]);
  const primaryContactByCompany = buildPrimaryContactByCompany((contactLinksResult.data ?? []) as ContactLink[]);

  return companies.map((company) => {
    const primaryContact = primaryContactByCompany.get(company.id);

    return {
      company_id: company.id,
      company_name: company.company_name,
      logo_url: company.company_logo_url,
      website: company.website,
      owner_id: company.owner_id,
      main_contact_name: primaryContact?.name ?? null,
      main_contact_email: primaryContact?.email ?? null,
      main_contact_phone: primaryContact?.phone ?? null,
      participation_status: statusByCompany.get(company.id) ?? null,
      events: eventsByCompany.get(company.id) ?? [],
    };
  });
}

function buildEventsByCompany(participations: ParticipationWithEvent[]) {
  const eventsByCompany = new Map<string, { eventId: string; eventName: string }[]>();
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
  const primaryContactByCompany = new Map<
    string,
    { name: string | null; email: string | null; phone: string | null }
  >();

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
