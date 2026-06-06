/* eslint-disable @next/next/no-img-element -- Small CRM table logos intentionally use native lazy-loaded images. */
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { MineToggle } from "@/components/mine-toggle";
import { OwnerCell } from "@/components/owner-cell";
import { COMPANIES_PAGE_SIZE } from "@/lib/loaders/companies-list.types";
import type { CompanyListItem } from "@/lib/loaders/companies-list.types";
import type { OrgUser } from "@/lib/ownership";

export function CompaniesLegacyView({
  companies,
  count,
  query,
  mine,
  page,
  users,
  currentUserId,
  ineligibleMessage,
  total,
}: {
  companies: CompanyListItem[];
  count: number;
  query: string;
  mine: boolean;
  page: number;
  users: OrgUser[];
  currentUserId: string;
  ineligibleMessage?: string;
  total?: number;
}) {
  return (
    <>
      {ineligibleMessage ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {ineligibleMessage}
          {total ? ` (${total} companies)` : null}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form className="flex max-w-xl flex-1 gap-2">
          {mine ? <input type="hidden" name="mine" value="1" /> : null}
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
            <Link
              href="/companies"
              className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm"
            >
              Reset
            </Link>
          ) : null}
        </form>
        <MineToggle basePath="/companies" params={{ q: query || undefined }} active={mine} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-[28%] px-4 py-3 font-semibold">Company</th>
              <th className="w-[14%] px-4 py-3 font-semibold">Events</th>
              <th className="w-[20%] px-4 py-3 font-semibold">Main contact</th>
              <th className="w-[10%] px-4 py-3 font-semibold">Status</th>
              <th className="w-[16%] px-4 py-3 font-semibold">Owner</th>
              <th className="w-[12%] px-4 py-3 font-semibold">Website</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {companies.length > 0 ? (
              companies.map((company) => (
                <tr key={company.company_id} className="align-top">
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
                        <Link
                          href={`/companies/${company.company_id}`}
                          className="truncate font-medium hover:text-primary"
                        >
                          {company.company_name}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground">
                          {company.main_contact_email ?? ""}
                        </div>
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
                    <OwnerCell
                      entity="company"
                      recordId={company.company_id}
                      ownerId={company.owner_id}
                      users={users}
                      currentUserId={currentUserId}
                    />
                  </td>
                  <td className="px-4 py-4">
                    {company.website ? (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-primary hover:underline"
                      >
                        {company.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">No website</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No companies found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageSize={COMPANIES_PAGE_SIZE}
          total={count}
          basePath="/companies"
          params={{ q: query || undefined, mine: mine ? "1" : undefined }}
        />
      </div>
    </>
  );
}
