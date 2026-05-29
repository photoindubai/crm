/* eslint-disable @next/next/no-img-element -- CRM brand logos intentionally use native lazy-loaded images. */
import Link from "next/link";
import { Plus, Search, Tags } from "lucide-react";
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

export const revalidate = 3600;

const PAGE_SIZE = 50;

type Brand = Database["public"]["Tables"]["brands"]["Row"];
type ParticipationBrand = Pick<Database["public"]["Tables"]["participation_brands"]["Row"], "brand_id" | "participation_id">;
type CompanyBrand = Pick<Database["public"]["Tables"]["company_brands"]["Row"], "brand_id" | "company_id">;
type BoothRow = {
  participation_id: string | null;
  booths: { booth_number: string } | null;
};

export default async function BrandsPage({ searchParams }: { searchParams?: Promise<PageSearchParams> }) {
  const params = await resolveSearchParams(searchParams);
  const { profile } = await requireActiveProfile();
  const orgId = profile.organization_id ?? "";

  const page = getPageParam(params);
  const query = getStringParam(params, "q")?.trim() ?? "";
  const mine = getStringParam(params, "mine") === "1";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const orgUsers = await getOrgUsers(orgId);

  const { brands, companyLinks, participationLinks, booths, count, companyLinkCount, participationLinkCount } = await loadCached(
    {
      keyParts: ["brands", orgId, page, query, mine ? `mine:${profile.id}` : "all"],
      tags: [cacheTags.orgBrands(orgId), cacheTags.orgCompanies(orgId), cacheTags.orgParticipations(orgId)],
      revalidateSeconds: CACHE_TTL.LIST_LONG,
    },
    async () => {
      const supabase = createSupabaseAdminClient();
      let request = supabase
        .from("brands")
        .select("*", { count: "exact" })
        .order("brand_name", { ascending: true })
        .range(from, to);

      if (query) {
        request = request.or(`brand_name.ilike.%${query}%,country.ilike.%${query}%,brand_description.ilike.%${query}%`);
      }

      if (mine) {
        request = request.eq("owner_id", profile.id);
      }

      const [{ data, error, count }, companyCountResult, participationCountResult] = await Promise.all([
        request,
        supabase.from("company_brands").select("id", { count: "exact", head: true }),
        supabase.from("participation_brands").select("id", { count: "exact", head: true }),
      ]);

      if (error) {
        throw new Error(error.message);
      }

      if (companyCountResult.error) {
        throw new Error(companyCountResult.error.message);
      }

      if (participationCountResult.error) {
        throw new Error(participationCountResult.error.message);
      }

      const brands = (data ?? []) as Brand[];
      const brandIds = brands.map((brand) => brand.id);
      const [companyLinksResult, participationLinksResult] =
        brandIds.length > 0
          ? await Promise.all([
              supabase.from("company_brands").select("brand_id,company_id").in("brand_id", brandIds),
              supabase.from("participation_brands").select("brand_id,participation_id").in("brand_id", brandIds),
            ])
          : [emptyResult<CompanyBrand[]>(), emptyResult<ParticipationBrand[]>()];

      if (companyLinksResult.error) {
        throw new Error(companyLinksResult.error.message);
      }

      if (participationLinksResult.error) {
        throw new Error(participationLinksResult.error.message);
      }

      const participationLinks = (participationLinksResult.data ?? []) as ParticipationBrand[];
      const participationIds = uniqueIds(participationLinks.map((link) => link.participation_id));
      const boothsResult =
        participationIds.length > 0
          ? await supabase
              .from("booth_assignments")
              .select("participation_id,booths(booth_number)")
              .in("participation_id", participationIds)
          : emptyResult<BoothRow[]>();

      if (boothsResult.error) {
        throw new Error(boothsResult.error.message);
      }

      return {
        brands,
        companyLinks: (companyLinksResult.data ?? []) as CompanyBrand[],
        participationLinks,
        booths: (boothsResult.data ?? []) as unknown as BoothRow[],
        count: count ?? 0,
        companyLinkCount: companyCountResult.count ?? 0,
        participationLinkCount: participationCountResult.count ?? 0,
      };
    },
  );
  const companyLinksByBrand = groupBy(companyLinks, (link) => link.brand_id);
  const participationLinksByBrand = groupBy(participationLinks, (link) => link.brand_id);
  const boothsByParticipation = groupBy(booths, (row) => row.participation_id);

  return (
    <AppShell title="Brands">
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px]">
        <form className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" aria-hidden="true" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search brands"
              className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          {mine ? <input type="hidden" name="mine" value="1" /> : null}
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Search</button>
          {query ? (
            <Link href="/brands" className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm">
              Reset
            </Link>
          ) : null}
        </form>
        <div className="flex items-center gap-2">
          <MineToggle basePath="/brands" params={{ q: query || undefined }} active={mine} />
          <button
            disabled
            className="inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground opacity-50"
          >
            <Plus size={16} aria-hidden="true" />
            Create Brand
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Metric label="Total brands" value={count} />
        <Metric label="Company links" value={companyLinkCount} />
        <Metric label="Participation links" value={participationLinkCount} />
      </div>

      {brands.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {brands.map((brand) => {
            const brandParticipationLinks = participationLinksByBrand.get(brand.id) ?? [];
            const boothNumbers = uniqueIds(
              brandParticipationLinks.flatMap((link) =>
                (boothsByParticipation.get(link.participation_id ?? "") ?? []).map((row) => row.booths?.booth_number),
              ),
            );

            return (
              <div key={brand.id} className="flex flex-col rounded-lg border border-border bg-white p-4 shadow-soft hover:border-primary">
                <Link href={`/brands/${brand.id}`} className="block">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                      {brand.brand_logo_url ? (
                        <img src={brand.brand_logo_url} alt="" loading="lazy" className="h-full w-full object-contain" />
                      ) : (
                        <Tags size={22} className="text-primary" aria-hidden="true" />
                      )}
                    </div>
                    <span className="rounded-full bg-secondary/15 px-2 py-1 text-[10px] font-bold uppercase text-secondary">
                      {brandParticipationLinks.length > 0 ? "Active" : "Unassigned"}
                    </span>
                  </div>
                  <h2 className="truncate text-lg font-semibold text-primary">{brand.brand_name}</h2>
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                    {brand.brand_description ?? brand.country ?? "No brand description."}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs font-semibold uppercase text-muted-foreground">
                    <span>{boothNumbers.length > 0 ? `Booth ${boothNumbers.slice(0, 2).join(", ")}` : "No booth"}</span>
                    <span>{companyLinksByBrand.get(brand.id)?.length ?? 0} companies</span>
                  </div>
                </Link>
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Owner</span>
                  <OwnerCell
                    entity="brand"
                    recordId={brand.id}
                    ownerId={brand.owner_id}
                    users={orgUsers}
                    currentUserId={profile.id}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white p-8 text-center text-sm text-muted-foreground shadow-soft">
          No brands found.
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-lg border border-border bg-white shadow-soft">
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={count}
          basePath="/brands"
          params={{ q: query || undefined, mine: mine ? "1" : undefined }}
        />
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-soft">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold text-primary">{value}</div>
    </div>
  );
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
  return { data, error: null, count: 0 };
}
