import Link from "next/link";
import { Pencil } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { MineToggle } from "@/components/mine-toggle";
import { OwnerCell } from "@/components/owner-cell";
import { CACHE_TTL } from "@/lib/cache/ttl";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { getOrgUsers } from "@/lib/ownership.server";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPageParam, getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import type { Database } from "@/lib/supabase/database.types";
import { DeleteContactButton } from "./delete-contact-button";

export const revalidate = 3600;

const PAGE_SIZE = 50;

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type CompanyContact = Pick<Database["public"]["Tables"]["company_contacts"]["Row"], "contact_id" | "company_id" | "role" | "is_primary">;
type Company = Pick<Database["public"]["Tables"]["companies"]["Row"], "id" | "company_name">;

export default async function ContactsPage({ searchParams }: { searchParams?: Promise<PageSearchParams> }) {
  const params = await resolveSearchParams(searchParams);
  const { profile } = await requireActiveProfile();
  const orgId = profile.organization_id ?? "";

  const page = getPageParam(params);
  const query = getStringParam(params, "q")?.trim() ?? "";
  const mine = getStringParam(params, "mine") === "1";
  const notice = getStringParam(params, "notice");
  const error = getStringParam(params, "error");
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const returnTo = buildContactsReturnTo(page, query);

  const orgUsers = await getOrgUsers(orgId);

  const { contacts, companies, links, count } = await loadCached(
    {
      keyParts: ["contacts", orgId, page, query, mine ? `mine:${profile.id}` : "all"],
      tags: [cacheTags.orgContacts(orgId), cacheTags.orgCompanies(orgId)],
      revalidateSeconds: CACHE_TTL.LIST_LONG,
    },
    async () => {
      const supabase = createSupabaseAdminClient();
      let request = supabase
        .from("contacts")
        .select("*", { count: "exact" })
        .order("last_name", { ascending: true, nullsFirst: false })
        .order("first_name", { ascending: true, nullsFirst: false })
        .range(from, to);

      if (query) {
        request = request.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`);
      }

      if (mine) {
        request = request.eq("owner_id", profile.id);
      }

      const { data, error, count } = await request;

      if (error) {
        throw new Error(error.message);
      }

      const contacts = (data ?? []) as Contact[];
      const contactIds = contacts.map((contact) => contact.id);
      const linksResult =
        contactIds.length > 0
          ? await supabase.from("company_contacts").select("contact_id,company_id,role,is_primary").in("contact_id", contactIds)
          : emptyResult<CompanyContact[]>();

      if (linksResult.error) {
        throw new Error(linksResult.error.message);
      }

      const links = (linksResult.data ?? []) as CompanyContact[];
      const companyIds = uniqueIds(links.map((link) => link.company_id));
      const companiesResult =
        companyIds.length > 0
          ? await supabase.from("companies").select("id,company_name").in("id", companyIds)
          : emptyResult<Company[]>();

      if (companiesResult.error) {
        throw new Error(companiesResult.error.message);
      }

      return {
        contacts,
        companies: (companiesResult.data ?? []) as Company[],
        links,
        count: count ?? 0,
      };
    },
  );
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const linksByContact = groupBy(links, (link) => link.contact_id);

  return (
    <AppShell title="Contacts">
      {getFlashMessage(notice, error) ? (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            getFlashMessage(notice, error)?.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {getFlashMessage(notice, error)?.message}
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form className="flex max-w-xl flex-1 gap-2">
          {mine ? <input type="hidden" name="mine" value="1" /> : null}
          <input
            name="q"
            defaultValue={query}
            placeholder="Search contacts"
            className="h-10 flex-1 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary"
          />
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Search</button>
          {query ? (
            <Link href="/contacts" className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm">
              Reset
            </Link>
          ) : null}
        </form>
        <MineToggle basePath="/contacts" params={{ q: query || undefined }} active={mine} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-[22%] px-4 py-3 font-semibold">Contact</th>
              <th className="w-[18%] px-4 py-3 font-semibold">Company</th>
              <th className="w-[14%] px-4 py-3 font-semibold">Role</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Phone</th>
              <th className="w-[14%] px-4 py-3 font-semibold">Email</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Owner</th>
              <th className="w-[8%] px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contacts.length > 0 ? (
              contacts.map((contact) => {
                const contactLinks = linksByContact.get(contact.id) ?? [];
                const primaryLink = contactLinks.find((link) => link.is_primary) ?? contactLinks[0];
                const company = primaryLink?.company_id ? companiesById.get(primaryLink.company_id) : null;

                return (
                  <tr key={contact.id} className="align-top">
                    <td className="px-4 py-4">
                      <Link href={`/contacts/${contact.id}?returnTo=${encodeURIComponent(returnTo)}`} className="truncate font-medium text-primary hover:underline">
                        {formatContactName(contact)}
                      </Link>
                      <div className="truncate text-xs text-muted-foreground">{contact.position ?? "No position"}</div>
                    </td>
                    <td className="px-4 py-4">
                      {company ? (
                        <Link href={`/companies/${company.id}`} className="truncate hover:text-primary">
                          {company.company_name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">No company</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{primaryLink?.role ?? "No role"}</td>
                    <td className="px-4 py-4 text-muted-foreground">{contact.phone ?? "No phone"}</td>
                    <td className="truncate px-4 py-4 text-muted-foreground">{contact.email ?? "No email"}</td>
                    <td className="px-4 py-4">
                      <OwnerCell
                        entity="contact"
                        recordId={contact.id}
                        ownerId={contact.owner_id}
                        users={orgUsers}
                        currentUserId={profile.id}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/contacts/${contact.id}?edit=1&returnTo=${encodeURIComponent(returnTo)}`}
                          title="Edit contact"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </Link>
                        <DeleteContactButton contactId={contact.id} returnTo={returnTo} compact />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No contacts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={count}
          basePath="/contacts"
          params={{ q: query || undefined, mine: mine ? "1" : undefined }}
        />
      </div>
    </AppShell>
  );
}

function formatContactName(contact: Contact) {
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "Unnamed contact";
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
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

function buildContactsReturnTo(page: number, query: string) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  if (query) {
    params.set("q", query);
  }

  const search = params.toString();
  return search ? `/contacts?${search}` : "/contacts";
}

function getFlashMessage(notice?: string, error?: string) {
  if (error) {
    const message =
      {
        contact_not_found: "Contact was not found.",
        contact_delete_failed: "Failed to delete contact.",
      }[error] ?? "The operation failed.";

    return { type: "error" as const, message };
  }

  if (notice) {
    const message =
      {
        contact_updated: "Contact updated.",
        contact_deleted: "Contact deleted.",
      }[notice] ?? "Saved.";

    return { type: "success" as const, message };
  }

  return null;
}
