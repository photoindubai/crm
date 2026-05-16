/* eslint-disable @next/next/no-img-element -- CRM logos intentionally use native lazy-loaded images. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, ClipboardList, Pencil, Plus, Tags, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MediaThumbnailButton } from "@/components/media-preview";
import { StatusBadge } from "@/components/status-badge";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { saveParticipationBrand, saveParticipationContact, saveParticipationMaterial } from "./actions";
import { DeleteMaterialButton } from "./delete-material-button";
import { DeleteParticipationBrandButton } from "./delete-participation-brand-button";
import { DeleteParticipationContactButton } from "./delete-participation-contact-button";

export const revalidate = 30;

type Participation = Database["public"]["Tables"]["participations"]["Row"];
type Company = Pick<
  Database["public"]["Tables"]["companies"]["Row"],
  "id" | "company_name" | "company_logo_url" | "city" | "country" | "website"
>;
type Event = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  "id" | "event_name" | "start_date" | "end_date" | "venue_name" | "city" | "country"
>;
type ContactLinkRow = {
  id: string;
  contact_id: string;
  role: string | null;
  is_primary: boolean | null;
  contacts: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    position: string | null;
  } | null;
};
type CompanyContactOptionRow = {
  role: string | null;
  is_primary: boolean | null;
  contacts: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    position: string | null;
  } | null;
};
type BoothRow = {
  booths: {
    booth_number: string;
    hall: string | null;
    zone: string | null;
    area_sqm: number | null;
    status: string | null;
  } | null;
};
type LogisticsRow = Pick<
  Database["public"]["Tables"]["participation_logistics"]["Row"],
  | "badges_status"
  | "check_in_status"
  | "conference_status"
  | "electricity_status"
  | "fascia_status"
  | "furniture_status"
  | "internet_status"
  | "notes"
  | "room_asset_status"
  | "stand_design_status"
>;
type BrandLinkRow = Pick<
  Database["public"]["Tables"]["participation_brands"]["Row"],
  "id" | "brand_id" | "display_on_website" | "priority"
>;
type BrandRow = Pick<Database["public"]["Tables"]["brands"]["Row"], "id" | "brand_name" | "website" | "brand_logo_url">;
type MaterialRow = Pick<
  Database["public"]["Tables"]["exhibitor_materials"]["Row"],
  "id" | "title" | "material_type" | "status" | "url" | "notes"
>;
type ActionRow = Database["public"]["Views"]["participation_action_list_view"]["Row"];
type TemplateRow = Pick<
  Database["public"]["Tables"]["action_templates"]["Row"],
  "id" | "title" | "action_type" | "channel" | "is_required" | "status" | "sort_order"
>;

export default async function ParticipationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await resolveSearchParams(searchParams);
  const { profile } = await requireActiveProfile();
  const organizationId = profile.organization_id ?? notFound();
  const panel = getStringParam(resolvedSearchParams, "panel");
  const brandLinkId = getStringParam(resolvedSearchParams, "brand_link_id");
  const contactLinkId = getStringParam(resolvedSearchParams, "contact_link_id");
  const materialId = getStringParam(resolvedSearchParams, "material_id");
  const notice = getStringParam(resolvedSearchParams, "notice");
  const error = getStringParam(resolvedSearchParams, "error");

  const { participation, company, event, contacts, companyContactOptions, booths, logistics, brandLinks, brands, allBrands, materials, actions, templates } =
    await loadCached(
      {
        keyParts: ["participation-detail", profile.organization_id, id],
        tags: [
          cacheTags.participations,
          cacheTags.participation(id),
          cacheTags.companies,
          cacheTags.events,
          cacheTags.brands,
          cacheTags.actions,
          cacheTags.actionTemplates,
        ],
      },
      async () => {
        const supabase = createSupabaseAdminClient();
        const participationResult = await supabase.from("participations").select("*").eq("id", id).single();

        if (participationResult.error) {
          if (participationResult.error.code === "PGRST116") {
            notFound();
          }

          throw new Error(participationResult.error.message);
        }

        const participation = participationResult.data as Participation;
        const [companyResult, eventResult, contactsResult, companyContactsResult, boothsResult, logisticsResult, brandLinksResult, materialsResult, actionsResult, templatesResult, allBrandsResult] =
          await Promise.all([
            participation.company_id
              ? supabase
                  .from("companies")
                  .select("id,company_name,company_logo_url,city,country,website")
                  .eq("id", participation.company_id)
                  .single()
              : emptyResult<Company | null>(null),
            participation.event_id
              ? supabase
                  .from("events")
                  .select("id,event_name,start_date,end_date,venue_name,city,country")
                  .eq("id", participation.event_id)
                  .single()
              : emptyResult<Event | null>(null),
            supabase
              .from("participation_contacts")
              .select("id,contact_id,role,is_primary,contacts(id,first_name,last_name,email,phone,position)")
              .eq("participation_id", id)
              .order("is_primary", { ascending: false }),
            participation.company_id
              ? supabase
                  .from("company_contacts")
                  .select("role,is_primary,contacts(id,first_name,last_name,email,phone,position)")
                  .eq("company_id", participation.company_id)
                  .order("is_primary", { ascending: false })
              : emptyResult<CompanyContactOptionRow[]>(),
            supabase
              .from("booth_assignments")
              .select("booths(booth_number,hall,zone,area_sqm,status)")
              .eq("participation_id", id),
            supabase
              .from("participation_logistics")
              .select(
                "badges_status,check_in_status,conference_status,electricity_status,fascia_status,furniture_status,internet_status,notes,room_asset_status,stand_design_status",
              )
              .eq("participation_id", id)
              .maybeSingle(),
            supabase
              .from("participation_brands")
              .select("id,brand_id,display_on_website,priority")
              .eq("participation_id", id),
            supabase
              .from("exhibitor_materials")
              .select("id,title,material_type,status,url,notes")
              .eq("participation_id", id)
              .order("created_at", { ascending: false }),
            supabase
              .from("participation_action_list_view")
              .select("*")
              .eq("participation_id", id)
              .order("due_date", { ascending: true, nullsFirst: false }),
            participation.event_id
              ? supabase
                  .from("action_templates")
                  .select("id,title,action_type,channel,is_required,status,sort_order")
                  .eq("event_id", participation.event_id)
                  .order("sort_order", { ascending: true })
              : emptyResult<TemplateRow[]>(),
            supabase.from("brands").select("id,brand_name,website,brand_logo_url").eq("organization_id", organizationId).order("brand_name", { ascending: true }),
          ]);

        const firstError =
          companyResult.error ??
          eventResult.error ??
          contactsResult.error ??
          companyContactsResult.error ??
          boothsResult.error ??
          logisticsResult.error ??
          brandLinksResult.error ??
          materialsResult.error ??
          actionsResult.error ??
          templatesResult.error ??
          allBrandsResult.error;

        if (firstError) {
          throw new Error(firstError.message);
        }

        const brandLinks = (brandLinksResult.data ?? []) as BrandLinkRow[];
        const brandIds = brandLinks.map((row) => row.brand_id).filter(Boolean) as string[];
        const brandsResult =
          brandIds.length > 0
            ? await supabase
                .from("brands")
                .select("id,brand_name,website,brand_logo_url")
                .in("id", brandIds)
                .order("brand_name", { ascending: true })
            : emptyResult<BrandRow[]>();

        if (brandsResult.error) {
          throw new Error(brandsResult.error.message);
        }

        return {
          participation,
          company: companyResult.data as Company | null,
          event: eventResult.data as Event | null,
          contacts: (contactsResult.data ?? []) as unknown as ContactLinkRow[],
          companyContactOptions: (companyContactsResult.data ?? []) as unknown as CompanyContactOptionRow[],
          booths: (boothsResult.data ?? []) as unknown as BoothRow[],
          logistics: (logisticsResult.data ?? null) as LogisticsRow | null,
          brandLinks,
          brands: (brandsResult.data ?? []) as BrandRow[],
          allBrands: (allBrandsResult.data ?? []) as BrandRow[],
          materials: ((materialsResult.data ?? []) as MaterialRow[]).filter((item) => Boolean(item.url)),
          actions: (actionsResult.data ?? []) as ActionRow[],
          templates: (templatesResult.data ?? []) as TemplateRow[],
        };
      },
    );

  const requiredActions = actions.filter((action) => action.is_required);
  const optionalActions = actions.filter((action) => !action.is_required);
  const displayName = participation.display_name ?? company?.company_name ?? "Unnamed participant";
  const selectedBrandLink = brandLinkId ? brandLinks.find((item) => item.id === brandLinkId) ?? null : null;
  const selectedBrand = selectedBrandLink?.brand_id ? brands.find((item) => item.id === selectedBrandLink.brand_id) ?? null : null;
  const selectedContactLink = contactLinkId ? contacts.find((item) => item.id === contactLinkId) ?? null : null;
  const selectedMaterial = materialId ? materials.find((item) => item.id === materialId) ?? null : null;
  const flashMessage = getFlashMessage(notice, error);

  return (
    <AppShell title="Participant Detail">
      <div className="space-y-6">
        <Link href="/participations" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to participations
        </Link>

        {flashMessage ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              flashMessage.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {flashMessage.message}
          </div>
        ) : null}

        <section className="rounded-lg border border-border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {company?.company_logo_url ? (
                <MediaThumbnailButton
                  item={{
                    id: `${company.id}-logo`,
                    title: `${company.company_name} logo`,
                    url: company.company_logo_url,
                    subtitle: "Company logo",
                  }}
                  className="h-full w-full"
                  imageClassName="h-full w-full object-contain"
                  fallbackClassName="flex h-full w-full items-center justify-center"
                />
              ) : (
                <Building2 size={30} className="text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-3xl font-bold text-primary">{displayName}</h2>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {company ? (
                  <Link href={`/companies/${company.id}`} className="font-medium text-primary hover:underline">
                    {company.company_name}
                  </Link>
                ) : (
                  <span>No company</span>
                )}
                <span>{event?.event_name ?? "No event"}</span>
                <span>{booths.map((row) => row.booths?.booth_number).filter(Boolean).join(", ") || "No booth"}</span>
              </div>
            </div>
            <StatusBadge value={participation.status} />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Event" icon={<CalendarDays size={18} aria-hidden="true" />}>
            <Info label="Name" value={event?.event_name ?? "No event"} />
            <Info label="Venue" value={[event?.venue_name, event?.city, event?.country].filter(Boolean).join(", ") || "No venue"} />
            <Info label="Dates" value={[event?.start_date, event?.end_date].filter(Boolean).join(" - ") || "No dates"} />
          </Panel>

          <Panel title="Booths" icon={<Building2 size={18} aria-hidden="true" />}>
            {booths.length > 0 ? (
              <div className="space-y-2">
                {booths.map((row, index) => (
                  <Info
                    key={`${row.booths?.booth_number}-${index}`}
                    label={row.booths?.booth_number ?? "Booth"}
                    value={[row.booths?.hall, row.booths?.zone, row.booths?.area_sqm ? `${row.booths.area_sqm} sqm` : null]
                      .filter(Boolean)
                      .join(", ")}
                  />
                ))}
              </div>
            ) : (
              <EmptyText>No booth assigned.</EmptyText>
            )}
          </Panel>

          <Panel title="Statuses" icon={<ClipboardList size={18} aria-hidden="true" />}>
            <BadgeLine label="Payment" value={participation.payment_status} />
            <BadgeLine label="Profile" value={participation.profile_status} />
            <BadgeLine label="Materials" value={participation.materials_status} />
            <BadgeLine label="Logistics" value={participation.logistics_status} />
            <BadgeLine label="SMM" value={participation.smm_status} />
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Panel title="Logistics Requests" icon={<ClipboardList size={18} aria-hidden="true" />}>
              <div className="space-y-1">
                {getLogisticsItems(logistics).map((item) => (
                  <LogisticsRequestRow key={item.key} label={item.label} status={item.status} />
                ))}
              </div>
              {logistics?.notes ? (
                <div className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  <div className="mb-1 text-xs font-semibold uppercase text-primary">Notes</div>
                  <p className="whitespace-pre-line">{logistics.notes}</p>
                </div>
              ) : null}
            </Panel>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Participant Contacts"
            icon={<Users size={18} aria-hidden="true" />}
            action={
              <Link href={`/participations/${id}?panel=contact`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Plus size={14} aria-hidden="true" />
                Add contact
              </Link>
            }
          >
            {panel === "contact" ? (
              <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-primary">{selectedContactLink ? "Edit participant contact" : "Add participant contact"}</h4>
                  <Link href={`/participations/${id}`} className="text-sm font-medium text-primary hover:underline">
                    Close
                  </Link>
                </div>
                <form action={saveParticipationContact} className="space-y-4">
                  <input type="hidden" name="participation_id" value={participation.id} />
                  <input type="hidden" name="contact_link_id" value={selectedContactLink?.id ?? ""} />
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedContactLink ? (
                      <>
                        <ReadOnlyField
                          label="Contact"
                          value={formatContactName(selectedContactLink.contacts)}
                          hint={selectedContactLink.contacts?.email ?? selectedContactLink.contacts?.phone ?? undefined}
                        />
                        <input type="hidden" name="contact_id" value={selectedContactLink.contact_id} />
                      </>
                    ) : (
                      <SelectField
                        label="Contact"
                        name="contact_id"
                        defaultValue=""
                        options={companyContactOptions.map((option) => ({
                          value: option.contacts?.id ?? "",
                          label: formatCompanyContactOption(option),
                          disabled: !option.contacts?.id,
                        }))}
                      />
                    )}
                    <Field label="Role" name="role" defaultValue={selectedContactLink?.role ?? ""} placeholder="Sales, Logistics, Marketing..." />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-primary">
                    <input
                      type="checkbox"
                      name="is_primary"
                      defaultChecked={Boolean(selectedContactLink?.is_primary)}
                      className="h-4 w-4 rounded border-border"
                    />
                    Set as primary participant contact
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
                    >
                      {selectedContactLink ? "Save contact link" : "Add contact"}
                    </button>
                    <Link href={`/participations/${id}`} className="text-sm font-medium text-muted-foreground hover:text-primary">
                      Cancel
                    </Link>
                  </div>
                </form>
              </div>
            ) : null}
            {contacts.length > 0 ? (
              <div className="divide-y divide-border rounded-lg border border-border">
                {contacts.map((item) => (
                  <ContactRow key={item.id} participationId={participation.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyText>No participant contacts.</EmptyText>
            )}
          </Panel>

          <Panel
            title="Represented Brands"
            icon={<Tags size={18} aria-hidden="true" />}
            action={
              <Link href={`/participations/${id}?panel=brand`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Plus size={14} aria-hidden="true" />
                Assign brand
              </Link>
            }
          >
            {panel === "brand" ? (
              <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-primary">{selectedBrandLink ? "Edit participation brand" : "Assign participation brand"}</h4>
                  <Link href={`/participations/${id}`} className="text-sm font-medium text-primary hover:underline">
                    Close
                  </Link>
                </div>
                <form action={saveParticipationBrand} className="space-y-4">
                  <input type="hidden" name="participation_id" value={participation.id} />
                  <input type="hidden" name="brand_link_id" value={selectedBrandLink?.id ?? ""} />
                  <input type="hidden" name="old_brand_id" value={selectedBrandLink?.brand_id ?? ""} />
                  <div className="grid gap-4 md:grid-cols-2">
                    {selectedBrandLink ? (
                      <>
                        <ReadOnlyField label="Brand" value={selectedBrand?.brand_name ?? "Unknown brand"} hint={selectedBrand?.website ?? undefined} />
                        <input type="hidden" name="brand_id" value={selectedBrandLink.brand_id ?? ""} />
                      </>
                    ) : (
                      <SelectField
                        label="Brand"
                        name="brand_id"
                        defaultValue=""
                        options={allBrands.map((brand) => ({
                          value: brand.id,
                          label: brand.brand_name ?? "Unnamed brand",
                        }))}
                      />
                    )}
                    <Field label="Priority" name="priority" type="number" defaultValue={selectedBrandLink?.priority?.toString() ?? ""} />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-primary">
                    <input
                      type="checkbox"
                      name="display_on_website"
                      defaultChecked={selectedBrandLink?.display_on_website ?? true}
                      className="h-4 w-4 rounded border-border"
                    />
                    Display on website
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
                    >
                      {selectedBrandLink ? "Save brand link" : "Assign brand"}
                    </button>
                    <Link href={`/participations/${id}`} className="text-sm font-medium text-muted-foreground hover:text-primary">
                      Cancel
                    </Link>
                  </div>
                </form>
              </div>
            ) : null}
            {brands.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {brands.map((brand) => {
                  const link = brandLinks.find((item) => item.brand_id === brand.id);
                  if (!link) {
                    return null;
                  }

                  return <ParticipationBrandCard key={link.id} participationId={participation.id} link={link} brand={brand} />;
                })}
              </div>
            ) : (
              <EmptyText>No brands assigned.</EmptyText>
            )}
          </Panel>
        </div>

        <Panel
          title="Materials"
          icon={<ClipboardList size={18} aria-hidden="true" />}
          action={
            <Link href={`/participations/${id}?panel=material`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              <Plus size={14} aria-hidden="true" />
              Add material
            </Link>
          }
        >
          {panel === "material" ? (
            <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="font-semibold text-primary">{selectedMaterial ? "Edit material" : "Add material"}</h4>
                <Link href={`/participations/${id}`} className="text-sm font-medium text-primary hover:underline">
                  Close
                </Link>
              </div>
              <form action={saveParticipationMaterial} className="space-y-4">
                <input type="hidden" name="participation_id" value={participation.id} />
                <input type="hidden" name="material_id" value={selectedMaterial?.id ?? ""} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Title" name="title" defaultValue={selectedMaterial?.title ?? ""} />
                  <Field label="Material type" name="material_type" defaultValue={selectedMaterial?.material_type ?? ""} placeholder="logo, folder, PDF..." />
                  <Field label="Status" name="status" defaultValue={selectedMaterial?.status ?? ""} placeholder="received, approved..." />
                  <Field label="File URL" name="url" defaultValue={selectedMaterial?.url ?? ""} placeholder="https://..." required />
                </div>
                <TextAreaField label="Notes" name="notes" defaultValue={selectedMaterial?.notes ?? ""} rows={4} />
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
                  >
                    {selectedMaterial ? "Save material" : "Add material"}
                  </button>
                  <Link href={`/participations/${id}`} className="text-sm font-medium text-muted-foreground hover:text-primary">
                    Cancel
                  </Link>
                </div>
              </form>
            </div>
          ) : null}
          {materials.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {materials.map((item) => (
                <MaterialCard key={item.id} participationId={participation.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyText>No materials linked.</EmptyText>
          )}
        </Panel>

        <Panel title="Actions" icon={<ClipboardList size={18} aria-hidden="true" />}>
          <ActionTable title="Required" rows={requiredActions} />
          <div className="mt-5">
            <ActionTable title="Optional" rows={optionalActions} />
          </div>
          {templates.length > 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              {templates.length} event templates available for future generated participant actions.
            </p>
          ) : null}
        </Panel>
      </div>
    </AppShell>
  );
}

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      <div className="rounded-lg border border-border bg-white p-4 shadow-soft">{children}</div>
    </section>
  );
}

function ParticipationBrandCard({
  participationId,
  link,
  brand,
}: {
  participationId: string;
  link: BrandLinkRow;
  brand: BrandRow;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <a
          href={brand.website ?? undefined}
          target={brand.website ? "_blank" : undefined}
          rel={brand.website ? "noreferrer" : undefined}
          className="flex min-w-0 flex-1 items-center gap-3 hover:text-primary"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
            {brand.brand_logo_url ? <img src={brand.brand_logo_url} alt="" loading="lazy" className="h-full w-full object-contain" /> : <Tags size={18} />}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-primary">{brand.brand_name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {[link.display_on_website ? "website" : "internal only", link.priority != null ? `priority ${link.priority}` : null]
                .filter(Boolean)
                .join(" / ") || "Brand link"}
            </div>
          </div>
        </a>
        <div className="flex items-center gap-1">
          <Link
            href={`/participations/${participationId}?panel=brand&brand_link_id=${link.id}`}
            title="Edit participation brand"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <Pencil size={15} aria-hidden="true" />
          </Link>
          <DeleteParticipationBrandButton participationId={participationId} brandLinkId={link.id} brandId={link.brand_id ?? ""} />
        </div>
      </div>
    </div>
  );
}

function MaterialCard({ participationId, item }: { participationId: string; item: MaterialRow }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
            <MediaThumbnailButton
              item={{
                id: item.id,
                title: item.title ?? item.material_type ?? "Material",
                url: item.url ?? "",
                subtitle: [item.material_type, item.status].filter(Boolean).join(" / ") || "Material",
                description: item.notes,
              }}
              className="h-full w-full"
              imageClassName="h-full w-full object-contain"
              fallbackClassName="flex h-full w-full items-center justify-center"
            />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-primary">{item.title ?? item.material_type ?? "Material"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {[item.material_type, item.status].filter(Boolean).join(" / ") || "Material"}
            </div>
            {item.notes ? <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.notes}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/participations/${participationId}?panel=material&material_id=${item.id}`}
            title="Edit material"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <Pencil size={15} aria-hidden="true" />
          </Link>
          <DeleteMaterialButton participationId={participationId} materialId={item.id} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {item.url ? (
          <>
            <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
              Open file
            </a>
            <a href={item.url} target="_blank" rel="noreferrer" download className="text-sm font-medium text-primary hover:underline">
              Download
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value || "Not set"}</div>
    </div>
  );
}

function BadgeLine({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 last:mb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <StatusBadge value={value} />
    </div>
  );
}

function LogisticsRequestRow({ label, status }: { label: string; status: string | null }) {
  const sent = isLogisticsSubmitted(status);

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-primary">{label}</div>
      </div>
      <div className="flex items-center">
        <span className="sr-only">{`${label}: ${formatLogisticsStatus(status)}`}</span>
        <span
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            sent ? "bg-slate-400" : "bg-slate-300"
          }`}
          aria-hidden="true"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
              sent ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </span>
      </div>
    </div>
  );
}

function ContactRow({ participationId, item }: { participationId: string; item: ContactLinkRow }) {
  const name = formatContactName(item.contacts);

  return (
    <div className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        {item.contacts?.id ? (
          <Link href={`/contacts/${item.contacts.id}`} className="truncate font-medium text-primary hover:underline">
            {name}
          </Link>
        ) : (
          <div className="truncate font-medium">{name}</div>
        )}
        <div className="truncate text-xs text-muted-foreground">{item.contacts?.position ?? item.role ?? "No role"}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-xs text-muted-foreground">
          <div>{item.contacts?.email ?? "No email"}</div>
          <div>{item.contacts?.phone ?? "No phone"}</div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/participations/${participationId}?panel=contact&contact_link_id=${item.id}`}
            title="Edit participant contact"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <Pencil size={15} aria-hidden="true" />
          </Link>
          <DeleteParticipationContactButton participationId={participationId} contactLinkId={item.id} contactId={item.contact_id} />
        </div>
      </div>
    </div>
  );
}

function ActionTable({ title, rows }: { title: string; rows: ActionRow[] }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-primary">{title}</h4>
      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="w-[42%] px-3 py-2">Action</th>
                <th className="w-[18%] px-3 py-2">Status</th>
                <th className="w-[20%] px-3 py-2">Type</th>
                <th className="w-[20%] px-3 py-2">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.action_id}>
                  <td className="truncate px-3 py-3 font-medium">{row.title}</td>
                  <td className="px-3 py-3">
                    <StatusBadge value={row.status} />
                  </td>
                  <td className="truncate px-3 py-3 text-muted-foreground">{row.action_type ?? row.channel ?? "No type"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{row.due_date ?? "No date"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyText>No {title.toLowerCase()} actions.</EmptyText>
      )}
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-primary">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="h-11 rounded-md border border-border bg-white px-3 text-sm text-primary outline-none ring-0 transition focus:border-primary"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-primary">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-11 rounded-md border border-border bg-white px-3 text-sm text-primary outline-none ring-0 transition focus:border-primary"
      >
        <option value="" disabled>
          Select option
        </option>
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium text-primary">{label}</span>
      <div className="rounded-md border border-border bg-white px-3 py-3 text-sm text-primary">
        <div>{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </div>
    </div>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  rows = 4,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-primary">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="rounded-md border border-border bg-white px-3 py-3 text-sm text-primary outline-none ring-0 transition focus:border-primary"
      />
    </label>
  );
}

function getFlashMessage(notice?: string, error?: string) {
  if (error) {
    const message =
      {
        material_url_required: "Material URL is required.",
        material_save_failed: "Failed to save material.",
        material_delete_failed: "Failed to delete material.",
        brand_required: "Select a brand first.",
        brand_not_found: "Selected brand was not found.",
        brand_save_failed: "Failed to save participation brand.",
        brand_delete_failed: "Failed to delete participation brand.",
        participant_contact_required: "Select a company contact first.",
        participant_contact_invalid: "Selected contact is not linked to this company.",
        participant_contact_save_failed: "Failed to save participant contact.",
        participant_contact_delete_failed: "Failed to delete participant contact.",
      }[error] ?? "The operation failed.";

    return { type: "error" as const, message };
  }

  if (notice) {
    const message =
      {
        material_created: "Material added.",
        material_updated: "Material updated.",
        material_deleted: "Material deleted.",
        brand_added: "Brand assigned to participant.",
        brand_updated: "Participation brand updated.",
        brand_deleted: "Brand removed from participant.",
        participant_contact_added: "Participant contact added.",
        participant_contact_updated: "Participant contact updated.",
        participant_contact_deleted: "Participant contact removed.",
      }[notice] ?? "Saved.";

    return { type: "success" as const, message };
  }

  return null;
}

function getLogisticsItems(logistics: LogisticsRow | null) {
  return [
    { key: "badges", label: "Badges", status: logistics?.badges_status ?? null },
    { key: "room_asset", label: "Room Asset", status: logistics?.room_asset_status ?? null },
    { key: "check_in", label: "Check In", status: logistics?.check_in_status ?? null },
    { key: "furniture", label: "Furniture", status: logistics?.furniture_status ?? null },
    { key: "electricity", label: "Electricity", status: logistics?.electricity_status ?? null },
    { key: "internet", label: "Internet", status: logistics?.internet_status ?? null },
    { key: "fascia", label: "Fascia", status: logistics?.fascia_status ?? null },
    { key: "stand_design", label: "Stand Design", status: logistics?.stand_design_status ?? null },
    { key: "conference", label: "Conference", status: logistics?.conference_status ?? null },
  ];
}

function isLogisticsSubmitted(status: string | null) {
  return ["submitted", "approved", "completed", "rejected", "waiting_for_organizer"].includes(status ?? "");
}

function formatLogisticsStatus(status: string | null) {
  if (!status) {
    return "No submission";
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function emptyResult<T>(data: T = [] as T) {
  return { data, error: null };
}

function formatContactName(
  contact:
    | {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }
    | null
    | undefined,
) {
  if (!contact) {
    return "Unnamed contact";
  }

  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "Unnamed contact";
}

function formatCompanyContactOption(option: CompanyContactOptionRow) {
  const name = formatContactName(option.contacts);
  const meta = [option.contacts?.position, option.contacts?.email, option.is_primary ? "primary company contact" : null].filter(Boolean).join(" / ");
  return meta ? `${name} - ${meta}` : name;
}
