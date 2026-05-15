/* eslint-disable @next/next/no-img-element -- Small CRM table logos intentionally use native lazy-loaded images. */
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { requireActiveProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPageParam, getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 30;

const PAGE_SIZE = 50;

type CompanyListRow = Database["public"]["Views"]["company_list_view"]["Row"];

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<PageSearchParams>;
}) {
  const params = await resolveSearchParams(searchParams);
  await requireActiveProfile();

  const page = getPageParam(params);
  const query = getStringParam(params, "q")?.trim() ?? "";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createSupabaseAdminClient();
  let request = supabase
    .from("company_list_view")
    .select("*", { count: "exact" })
    .order("company_name", { ascending: true })
    .range(from, to);

  if (query) {
    request = request.ilike("company_name", `%${query}%`);
  }

  const { data, error, count } = await request;

  if (error) {
    throw new Error(error.message);
  }

  const companies = data ?? [];

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
              <th className="w-[30%] px-4 py-3 font-semibold">Company</th>
              <th className="w-[14%] px-4 py-3 font-semibold">Location</th>
              <th className="w-[14%] px-4 py-3 font-semibold">Booth</th>
              <th className="w-[18%] px-4 py-3 font-semibold">Main contact</th>
              <th className="w-[11%] px-4 py-3 font-semibold">Status</th>
              <th className="w-[13%] px-4 py-3 font-semibold">Website</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {companies.length > 0 ? (
              companies.map((company) => <CompanyRow key={company.company_id} company={company} />)
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
          pageSize={PAGE_SIZE}
          total={count ?? 0}
          basePath="/companies"
          params={{ q: query || undefined }}
        />
      </div>
    </AppShell>
  );
}

function CompanyRow({ company }: { company: CompanyListRow }) {
  const location = [company.city, company.country].filter(Boolean).join(", ") || "No location";

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
      <td className="px-4 py-4 text-muted-foreground">{location}</td>
      <td className="px-4 py-4 text-muted-foreground">{company.booth_numbers || "No booth"}</td>
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
