/* eslint-disable @next/next/no-img-element -- CRM brand logos intentionally use native lazy-loaded images. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, Tags } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { CACHE_TTL } from "@/lib/cache/ttl";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { loadBrandLogoSet } from "@/lib/files/loaders";
import { resolveBrandLogo, resolveBrandLogoForDisplay, resolveLogoSetUrls } from "@/lib/files/resolve";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { LogoUploadForm } from "@/components/uploads/logo-upload-form";

export const revalidate = 3600;

type Brand = Database["public"]["Tables"]["brands"]["Row"];
type CompanyBrand = Pick<Database["public"]["Tables"]["company_brands"]["Row"], "company_id">;
type ParticipationBrand = Pick<Database["public"]["Tables"]["participation_brands"]["Row"], "participation_id">;
type Company = Pick<Database["public"]["Tables"]["companies"]["Row"], "id" | "company_name" | "city" | "country" | "website">;
type Participation = Pick<
  Database["public"]["Tables"]["participations"]["Row"],
  "id" | "display_name" | "company_id" | "event_id" | "status" | "participation_type" | "package_name"
>;
type Event = Pick<Database["public"]["Tables"]["events"]["Row"], "id" | "event_name">;
type BoothRow = {
  participation_id: string | null;
  booths: { booth_number: string; hall: string | null; zone: string | null } | null;
};
type FileRow = Database["public"]["Tables"]["files"]["Row"];

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireActiveProfile();
  const orgId = profile.organization_id ?? "";

  const { brand, primaryLogoFile, logoSet, companies, participations, events, participationCompanies, booths } = await loadCached(
    {
      keyParts: ["brand-detail", orgId, id],
      tags: [
        cacheTags.orgBrands(orgId),
        cacheTags.brandDetail(id),
        cacheTags.orgCompanies(orgId),
        cacheTags.orgParticipations(orgId),
        cacheTags.orgEvents(orgId),
      ],
      revalidateSeconds: CACHE_TTL.DETAIL_LONG,
    },
    async () => {
      const supabase = createSupabaseAdminClient();
      const [brandResult, companyLinksResult, participationLinksResult] = await Promise.all([
        supabase.from("brands").select("*").eq("id", id).single(),
        supabase.from("company_brands").select("company_id").eq("brand_id", id),
        supabase.from("participation_brands").select("participation_id").eq("brand_id", id),
      ]);

      if (brandResult.error) {
        if (brandResult.error.code === "PGRST116") {
          notFound();
        }

        throw new Error(brandResult.error.message);
      }

      const firstError = companyLinksResult.error ?? participationLinksResult.error;

      if (firstError) {
        throw new Error(firstError.message);
      }

      const brand = brandResult.data as Brand;
      const companyIds = uniqueIds(((companyLinksResult.data ?? []) as CompanyBrand[]).map((link) => link.company_id));
      const participationIds = uniqueIds(((participationLinksResult.data ?? []) as ParticipationBrand[]).map((link) => link.participation_id));

      const [companiesResult, participationsResult, boothsResult] = await Promise.all([
        companyIds.length > 0
          ? supabase.from("companies").select("id,company_name,city,country,website").in("id", companyIds).order("company_name")
          : emptyResult<Company[]>(),
        participationIds.length > 0
          ? supabase
              .from("participations")
              .select("id,display_name,company_id,event_id,status,participation_type,package_name")
              .in("id", participationIds)
          : emptyResult<Participation[]>(),
        participationIds.length > 0
          ? supabase.from("booth_assignments").select("participation_id,booths(booth_number,hall,zone)").in("participation_id", participationIds)
          : emptyResult<BoothRow[]>(),
      ]);

      if (companiesResult.error ?? participationsResult.error ?? boothsResult.error) {
        throw new Error((companiesResult.error ?? participationsResult.error ?? boothsResult.error)?.message);
      }

      const participations = (participationsResult.data ?? []) as Participation[];
      const eventIds = uniqueIds(participations.map((participation) => participation.event_id));
      const participationCompanyIds = uniqueIds(participations.map((participation) => participation.company_id));
      const [eventsResult, participationCompaniesResult] = await Promise.all([
        eventIds.length > 0 ? supabase.from("events").select("id,event_name").in("id", eventIds) : emptyResult<Event[]>(),
        participationCompanyIds.length > 0
          ? supabase.from("companies").select("id,company_name,city,country,website").in("id", participationCompanyIds)
          : emptyResult<Company[]>(),
      ]);

      if (eventsResult.error ?? participationCompaniesResult.error) {
        throw new Error((eventsResult.error ?? participationCompaniesResult.error)?.message);
      }

      const directCompanies = (companiesResult.data ?? []) as Company[];
      const participationCompanies = (participationCompaniesResult.data ?? []) as Company[];
      const companies = dedupeCompanies([...directCompanies, ...participationCompanies]);

      let primaryLogoFile: FileRow | null = null;
      if (brand.primary_logo_file_id) {
        const { data: fileRow } = await supabase.from("files").select("*").eq("id", brand.primary_logo_file_id).maybeSingle();
        primaryLogoFile = (fileRow as FileRow | null) ?? null;
      }
      const logoSet = await loadBrandLogoSet(brand.id);

      return {
        brand,
        primaryLogoFile,
        logoSet,
        companies,
        participations,
        events: (eventsResult.data ?? []) as Event[],
        participationCompanies,
        booths: (boothsResult.data ?? []) as unknown as BoothRow[],
      };
    },
  );
  const participationCompaniesById = new Map(participationCompanies.map((company) => [company.id, company]));
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const boothsByParticipation = groupBy(booths, (row) => row.participation_id);
  const brandLogoUrl = resolveBrandLogoForDisplay(brand, logoSet, primaryLogoFile) ?? resolveBrandLogo(brand, primaryLogoFile);
  const logoUrls = resolveLogoSetUrls(logoSet);

  return (
    <AppShell title="Brand Detail">
      <div className="space-y-6">
        <Link href="/brands" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to brands
        </Link>

        <section className="rounded-lg border border-border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {brandLogoUrl ? (
                <img src={brandLogoUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
              ) : (
                <Tags size={30} className="text-primary" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-3xl font-bold text-primary">{brand.brand_name}</h2>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>{brand.country ?? "No country"}</span>
                {brand.website ? (
                  <a href={brand.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {brand.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <span>No website</span>
                )}
              </div>
              <p className="mt-4 max-w-4xl whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {brand.brand_description ?? "No brand description."}
              </p>
            </div>
          </div>
        </section>

        <Panel title="Logos" icon={<Tags size={18} aria-hidden="true" />}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 text-sm font-semibold text-primary">Full logo</div>
              <div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                {logoUrls.thumb || logoUrls.full ? (
                  <img src={logoUrls.thumb ?? logoUrls.full ?? ""} alt="" loading="lazy" className="h-full w-full object-contain" />
                ) : (
                  <Tags size={20} className="text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LogoUploadForm endpoint="/api/files/brand-logo" entityField="brandId" entityId={brand.id} logoRole="full" label="Upload full" />
                {logoUrls.full ? (
                  <a
                    href={logoUrls.full}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-semibold text-primary hover:bg-muted"
                  >
                    Download full
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 text-sm font-semibold text-primary">Inverted full logo</div>
              <div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                {logoUrls.thumb_inverted || logoUrls.full_inverted ? (
                  <img
                    src={logoUrls.thumb_inverted ?? logoUrls.full_inverted ?? ""}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Tags size={20} className="text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LogoUploadForm
                  endpoint="/api/files/brand-logo"
                  entityField="brandId"
                  entityId={brand.id}
                  logoRole="full_inverted"
                  label="Upload inverted"
                />
                {logoUrls.full_inverted ? (
                  <a
                    href={logoUrls.full_inverted}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-semibold text-primary hover:bg-muted"
                  >
                    Download inverted
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-3">
          <Metric label="Companies" value={companies.length} />
          <Metric label="Participations" value={participations.length} />
          <Metric label="Booths" value={uniqueIds(booths.map((row) => row.booths?.booth_number)).length} />
        </div>

        <Panel title="Companies" icon={<Building2 size={18} aria-hidden="true" />}>
          {companies.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {companies.map((company) => (
                <Link key={company.id} href={`/companies/${company.id}`} className="rounded-lg border border-border p-3 hover:bg-muted/50">
                  <div className="font-medium text-primary">{company.company_name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {[company.city, company.country].filter(Boolean).join(", ") || "No location"}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyText>No company links.</EmptyText>
          )}
        </Panel>

        <Panel title="Participations" icon={<CalendarDays size={18} aria-hidden="true" />}>
          {participations.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="w-[30%] px-3 py-2">Participant</th>
                    <th className="w-[28%] px-3 py-2">Event</th>
                    <th className="w-[18%] px-3 py-2">Booth</th>
                    <th className="w-[12%] px-3 py-2">Type</th>
                    <th className="w-[12%] px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {participations.map((participation) => {
                    const company = participation.company_id ? participationCompaniesById.get(participation.company_id) : null;
                    const event = participation.event_id ? eventsById.get(participation.event_id) : null;
                    const boothNumbers = (boothsByParticipation.get(participation.id) ?? [])
                      .map((row) => row.booths?.booth_number)
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <tr key={participation.id}>
                        <td className="px-3 py-3">
                          <Link href={`/participations/${participation.id}`} className="truncate font-medium text-primary hover:underline">
                            {participation.display_name ?? company?.company_name ?? "Participant"}
                          </Link>
                        </td>
                        <td className="truncate px-3 py-3 text-muted-foreground">{event?.event_name ?? "No event"}</td>
                        <td className="truncate px-3 py-3 text-muted-foreground">{boothNumbers || "No booth"}</td>
                        <td className="truncate px-3 py-3 text-muted-foreground">{participation.participation_type ?? "Not set"}</td>
                        <td className="px-3 py-3">
                          <StatusBadge value={participation.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyText>No participation links.</EmptyText>
          )}
        </Panel>
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

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
        {icon}
        {title}
      </h3>
      <div className="rounded-lg border border-border bg-white p-4 shadow-soft">{children}</div>
    </section>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
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

function dedupeCompanies(companies: Company[]) {
  const map = new Map<string, Company>();

  for (const company of companies) {
    map.set(company.id, company);
  }

  return Array.from(map.values()).sort((a, b) => a.company_name.localeCompare(b.company_name));
}
