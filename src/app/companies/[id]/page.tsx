/* eslint-disable @next/next/no-img-element -- CRM logos intentionally use native lazy-loaded images. */
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  ExternalLink as ExternalLinkIcon,
  FileText,
  Globe2,
  Mail,
  MapPin,
  Megaphone,
  MoreVertical,
  PackageCheck,
  Pencil,
  Phone,
  Plus,
  Tags,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MediaThumbnailButton } from "@/components/media-preview";
import { StatusBadge } from "@/components/status-badge";
import { CACHE_TTL } from "@/lib/cache/ttl";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { loadCompanyLogoSet } from "@/lib/files/loaders";
import { resolveCompanyLogo, resolveCompanyLogoForDisplay, resolveLogoSetUrls } from "@/lib/files/resolve";
import { getStringParam, resolveSearchParams, type PageSearchParams } from "@/lib/search-params";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { assignCompanyBrand, updateCompanyDetails } from "./actions";
import { BrandPortfolio } from "./brand-portfolio";
import { CompanyContactForm } from "./company-contact-form";
import { DeleteContactButton } from "@/app/contacts/delete-contact-button";
import { LogoUploadForm } from "@/components/uploads/logo-upload-form";

export const revalidate = 3600;

type Company = Database["public"]["Tables"]["companies"]["Row"];

type ContactRow = {
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

type ParticipationRow = Pick<
  Database["public"]["Tables"]["participations"]["Row"],
  | "id"
  | "event_id"
  | "status"
  | "booking_status"
  | "payment_status"
  | "profile_status"
  | "materials_status"
  | "logistics_status"
  | "smm_status"
  | "package_name"
  | "participation_type"
  | "internal_notes"
> & {
  events: {
    event_name: string;
    start_date: string | null;
    end_date: string | null;
    venue_name: string | null;
  } | null;
};

type BrandRow = Pick<
  Database["public"]["Tables"]["brands"]["Row"],
  "id" | "brand_name" | "website" | "brand_logo_url" | "brand_description" | "country"
>;

type BrandOptionRow = Pick<Database["public"]["Tables"]["brands"]["Row"], "id" | "brand_name">;

type CompanyBrandLinkRow = Pick<Database["public"]["Tables"]["company_brands"]["Row"], "brand_id">;

type ParticipationBrandLinkRow = Pick<
  Database["public"]["Tables"]["participation_brands"]["Row"],
  "participation_id" | "brand_id"
>;

type CompanyActionRow = Database["public"]["Views"]["company_action_list_view"]["Row"];

type LogisticsRow = Pick<
  Database["public"]["Tables"]["participation_logistics"]["Row"],
  | "participation_id"
  | "badges_status"
  | "check_in_status"
  | "conference_status"
  | "electricity_status"
  | "fascia_status"
  | "furniture_status"
  | "internet_status"
  | "room_asset_status"
  | "stand_design_status"
>;

type NoteRow = Pick<
  Database["public"]["Tables"]["notes"]["Row"],
  "id" | "body" | "note_type" | "created_at" | "participation_id"
>;
type FileRow = Database["public"]["Tables"]["files"]["Row"];

export default async function CompanyDetailPage({
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
  const notice = getStringParam(resolvedSearchParams, "notice");
  const error = getStringParam(resolvedSearchParams, "error");

  const { company, primaryLogoFile, logoSet, contacts, participations, notes, actions, logistics, brands, companyBrandLinks } = await loadCached(
    {
      keyParts: ["company-detail", organizationId, id],
      tags: [
        cacheTags.orgCompanies(organizationId),
        cacheTags.companyDetail(id),
        cacheTags.orgParticipations(organizationId),
        cacheTags.orgBrands(organizationId),
        cacheTags.orgActions(organizationId),
        cacheTags.orgNotes(organizationId),
      ],
      revalidateSeconds: CACHE_TTL.DETAIL_LONG,
    },
    async () => {
      const supabase = createSupabaseAdminClient();

      const [companyResult, contactsResult, participationsResult, notesResult, companyBrandLinksResult, actionsResult] =
        await Promise.all([
          supabase.from("companies").select("*").eq("id", id).single(),
          supabase
            .from("company_contacts")
            .select("role,is_primary,contacts(id,first_name,last_name,email,phone,position)")
            .eq("company_id", id)
            .order("is_primary", { ascending: false }),
          supabase
            .from("participations")
            .select(
              "id,event_id,status,booking_status,payment_status,profile_status,materials_status,logistics_status,smm_status,package_name,participation_type,internal_notes,events(event_name,start_date,end_date,venue_name)",
            )
            .eq("company_id", id)
            .order("created_at", { ascending: false }),
          supabase
            .from("notes")
            .select("id,body,note_type,created_at,participation_id")
            .eq("company_id", id)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("company_brands")
            .select("brand_id")
            .eq("company_id", id),
          supabase
            .from("company_action_list_view")
            .select("*")
            .eq("company_id", id)
            .order("due_date", { ascending: true, nullsFirst: false }),
        ]);

      if (companyResult.error) {
        if (companyResult.error.code === "PGRST116") {
          notFound();
        }

        throw new Error(companyResult.error.message);
      }

      const firstError =
        contactsResult.error ??
        participationsResult.error ??
        notesResult.error ??
        companyBrandLinksResult.error ??
        actionsResult.error;

      if (firstError) {
        throw new Error(firstError.message);
      }

      const participations = (participationsResult.data ?? []) as unknown as ParticipationRow[];
      const participationIds = participations.map((participation) => participation.id);

        const [participationBrandsResult, logisticsResult] =
        participationIds.length > 0
          ? await Promise.all([
              supabase
                .from("participation_brands")
                .select("participation_id,brand_id")
                .in("participation_id", participationIds),
              supabase
                .from("participation_logistics")
                .select(
                  "participation_id,badges_status,check_in_status,conference_status,electricity_status,fascia_status,furniture_status,internet_status,room_asset_status,stand_design_status",
                )
                .in("participation_id", participationIds),
            ])
          : [emptyResult(), emptyResult()];

      const relationError =
        participationBrandsResult.error ??
        logisticsResult.error;

      if (relationError) {
        throw new Error(relationError.message);
      }

      const companyBrandLinks = (companyBrandLinksResult.data ?? []) as CompanyBrandLinkRow[];
      const participationBrandLinks = (participationBrandsResult.data ?? []) as ParticipationBrandLinkRow[];
      const brandIds = uniqueIds([
        ...companyBrandLinks.map((row) => row.brand_id),
        ...participationBrandLinks.map((row) => row.brand_id),
      ]);
      const brandsResult =
        brandIds.length > 0
          ? await supabase
              .from("brands")
              .select("id,brand_name,website,brand_logo_url,brand_description,country")
              .in("id", brandIds)
              .order("brand_name", { ascending: true })
          : emptyResult<BrandRow>();

      if (brandsResult.error) {
        throw new Error(brandsResult.error.message);
      }

      let primaryLogoFile: FileRow | null = null;
      if (companyResult.data?.primary_logo_file_id) {
        const { data: fileRow } = await supabase
          .from("files")
          .select("*")
          .eq("id", companyResult.data.primary_logo_file_id)
          .maybeSingle();
        primaryLogoFile = (fileRow as FileRow | null) ?? null;
      }
      const logoSet = await loadCompanyLogoSet(id);

      return {
        company: companyResult.data as Company,
        primaryLogoFile,
        logoSet,
        contacts: (contactsResult.data ?? []) as unknown as ContactRow[],
        participations,
        notes: (notesResult.data ?? []) as NoteRow[],
        actions: ((actionsResult.data ?? []) as CompanyActionRow[]).slice(0, 8),
        logistics: (logisticsResult.data ?? []) as LogisticsRow[],
        brands: (brandsResult.data ?? []) as BrandRow[],
        companyBrandLinks,
      };
    },
  );

  let availableBrands: BrandOptionRow[] = [];
  if (panel === "brand") {
    const assignedBrandIds = new Set(companyBrandLinks.map((row) => row.brand_id));
    const supabase = createSupabaseAdminClient();
    const { data: brandOptionsResult, error: brandOptionsError } = await supabase
      .from("brands")
      .select("id,brand_name")
      .eq("organization_id", organizationId)
      .order("brand_name", { ascending: true });

    if (brandOptionsError) {
      throw new Error(brandOptionsError.message);
    }

    availableBrands = (brandOptionsResult ?? []).filter((brand) => !assignedBrandIds.has(brand.id));
  }

  const logisticsByParticipation = new Map(logistics.map((row) => [row.participation_id, row]));
  const actionRows = actions;
  const brandPortfolio = brands;
  const location = [company.city, company.country].filter(Boolean).join(", ") || "No location";
  const companyLogoUrl = resolveCompanyLogoForDisplay(company, logoSet, primaryLogoFile) ?? resolveCompanyLogo(company, primaryLogoFile);
  const logoUrls = resolveLogoSetUrls(logoSet);
  const flashMessage = getFlashMessage(notice, error);

  return (
    <AppShell title="Company Detail">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/companies" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to companies
          </Link>
          <Link
            href={`/companies/${id}?panel=edit`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-medium text-primary hover:bg-muted"
          >
            <Pencil size={16} aria-hidden="true" />
            Edit details
          </Link>
        </div>

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

        {panel === "edit" ? (
          <section className="rounded-lg border border-border bg-white p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-primary">Edit company</h3>
                <p className="text-sm text-muted-foreground">Update base company fields. Participation data stays separate.</p>
              </div>
              <Link href={`/companies/${id}`} className="text-sm font-medium text-primary hover:underline">
                Close
              </Link>
            </div>
            <form action={updateCompanyDetails} className="space-y-4">
              <input type="hidden" name="company_id" value={company.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Company name" name="company_name" defaultValue={company.company_name} required />
                <Field label="Website" name="website" defaultValue={company.website ?? ""} placeholder="https://example.com" />
                <Field label="Company email" name="company_email" type="email" defaultValue={company.company_email ?? ""} />
                <Field label="Company phone" name="company_phone" defaultValue={company.company_phone ?? ""} />
                <Field label="City" name="city" defaultValue={company.city ?? ""} />
                <Field label="Country" name="country" defaultValue={company.country ?? ""} />
                <Field label="Facebook" name="facebook_url" defaultValue={company.facebook_url ?? ""} />
                <Field label="Instagram" name="instagram_url" defaultValue={company.instagram_url ?? ""} />
                <Field label="LinkedIn" name="linkedin_url" defaultValue={company.linkedin_url ?? ""} />
                <Field label="YouTube" name="youtube_url" defaultValue={company.youtube_url ?? ""} />
                <Field label="Other social" name="other_social_url" defaultValue={company.other_social_url ?? ""} />
                <Field label="Logo URL" name="company_logo_url" defaultValue={company.company_logo_url ?? ""} />
              </div>
              <Field label="Address" name="address" defaultValue={company.address ?? ""} />
              <TextAreaField label="Description" name="description" defaultValue={company.description ?? ""} rows={7} />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Save company
                </button>
                <Link href={`/companies/${id}`} className="text-sm font-medium text-muted-foreground hover:text-primary">
                  Cancel
                </Link>
              </div>
            </form>
          </section>
        ) : null}

        <section className="rounded-lg border border-border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {companyLogoUrl ? (
                <MediaThumbnailButton
                  item={{
                    id: `${company.id}-logo`,
                    title: `${company.company_name} logo`,
                    url: companyLogoUrl,
                    subtitle: "Company logo",
                  }}
                  className="h-full w-full"
                  imageClassName="h-full w-full object-contain"
                  fallbackClassName="flex h-full w-full items-center justify-center"
                />
              ) : (
                <Building2 size={34} className="text-muted-foreground" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-3xl font-bold text-primary">{company.company_name}</h2>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <MetaLink href={company.website} icon={<Globe2 size={15} aria-hidden="true" />}>
                  {company.website ? company.website.replace(/^https?:\/\//, "") : "No website"}
                </MetaLink>
                <MetaItem icon={<MapPin size={15} aria-hidden="true" />}>{location}</MetaItem>
                <MetaItem icon={<Phone size={15} aria-hidden="true" />}>{company.company_phone ?? "No company phone"}</MetaItem>
                <MetaItem icon={<Mail size={15} aria-hidden="true" />}>{company.company_email ?? "No company email"}</MetaItem>
                {companyLogoUrl ? (
                  <a
                    href={companyLogoUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <Building2 size={15} aria-hidden="true" />
                    Download company logo
                    <ExternalLinkIcon size={13} aria-hidden="true" />
                  </a>
                ) : null}
              </div>
              <p className="mt-4 max-w-4xl whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {[company.address, company.description].filter(Boolean).join("\n\n") || "No company description yet."}
              </p>
            </div>
          </div>
        </section>

        <Panel className="col-span-12" title="Logos" icon={<Building2 size={19} aria-hidden="true" />}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 text-sm font-semibold text-primary">Full logo</div>
              <div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                {logoUrls.thumb || logoUrls.full ? (
                  <img src={logoUrls.thumb ?? logoUrls.full ?? ""} alt="" loading="lazy" className="h-full w-full object-contain" />
                ) : (
                  <Building2 size={20} className="text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LogoUploadForm endpoint="/api/files/company-logo" entityField="companyId" entityId={company.id} logoRole="full" label="Upload full" />
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
                  <Building2 size={20} className="text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LogoUploadForm
                  endpoint="/api/files/company-logo"
                  entityField="companyId"
                  entityId={company.id}
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

        <div className="grid grid-cols-12 gap-4">
          <Panel
            className="col-span-12 lg:col-span-7"
            title="Company Contacts"
            icon={<Users size={19} aria-hidden="true" />}
            action={
              <Link href={`/companies/${id}?panel=contact`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Plus size={14} aria-hidden="true" />
                Add contact
              </Link>
            }
          >
            {panel === "contact" ? (
              <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-primary">Add contact</h4>
                  <Link href={`/companies/${id}`} className="text-sm font-medium text-primary hover:underline">
                    Close
                  </Link>
                </div>
                <CompanyContactForm companyId={company.id} />
              </div>
            ) : null}
            {contacts.length > 0 ? (
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {contacts.map((item) => (
                  <ContactCard key={item.contacts?.id ?? item.role ?? "contact"} item={item} companyId={company.id} />
                ))}
              </div>
            ) : (
              <EmptyText>No contacts.</EmptyText>
            )}
          </Panel>

          <Panel
            className="col-span-12 lg:col-span-5"
            title="Brand Portfolio"
            icon={<Tags size={19} aria-hidden="true" />}
            action={
              <Link href={`/companies/${id}?panel=brand`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <Plus size={14} aria-hidden="true" />
                Assign brand
              </Link>
            }
          >
            {panel === "brand" ? (
              <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-primary">Assign brand</h4>
                  <Link href={`/companies/${id}`} className="text-sm font-medium text-primary hover:underline">
                    Close
                  </Link>
                </div>
                {availableBrands.length > 0 ? (
                  <form action={assignCompanyBrand} className="space-y-4">
                    <input type="hidden" name="company_id" value={company.id} />
                    <label className="grid gap-2 text-sm">
                      <span className="font-medium text-primary">Brand</span>
                      <select
                        name="brand_id"
                        defaultValue=""
                        className="h-11 rounded-md border border-border bg-white px-3 text-sm text-primary outline-none ring-0 transition focus:border-primary"
                      >
                        <option value="" disabled>
                          Select brand
                        </option>
                        {availableBrands.map((brand) => (
                          <option key={brand.id} value={brand.id}>
                            {brand.brand_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
                      >
                        Assign brand
                      </button>
                      <Link href={`/companies/${id}`} className="text-sm font-medium text-muted-foreground hover:text-primary">
                        Cancel
                      </Link>
                    </div>
                  </form>
                ) : (
                  <EmptyText>All available brands are already assigned to this company.</EmptyText>
                )}
              </div>
            ) : null}
            {brandPortfolio.length > 0 ? (
              <BrandPortfolio brands={brandPortfolio} />
            ) : (
              <EmptyText>No brands.</EmptyText>
            )}
          </Panel>

          <Panel
            className="col-span-12"
            title="Action Plan"
            icon={<ClipboardList size={19} aria-hidden="true" />}
            action={
              <button disabled className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground opacity-50">
                <Plus size={14} aria-hidden="true" />
                New action
              </button>
            }
          >
            {actionRows.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <thead className="bg-muted text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="w-[31%] px-4 py-3 font-semibold">Action name</th>
                      <th className="w-[15%] px-4 py-3 font-semibold">Status</th>
                      <th className="w-[16%] px-4 py-3 font-semibold">Deadline</th>
                      <th className="w-[30%] px-4 py-3 font-semibold">Notes</th>
                      <th className="w-[8%] px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {actionRows.map((action) => (
                      <tr key={action.action_id} className="hover:bg-muted/40">
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <ActionIcon type={action.action_type} />
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-primary">{action.title}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {[action.action_type, action.channel, action.is_required ? "required" : null].filter(Boolean).join(" / ") ||
                                  "No type"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge value={action.status} />
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{action.due_date ?? "No date"}</td>
                        <td className="truncate px-4 py-4 text-muted-foreground">{action.description ?? "No notes"}</td>
                        <td className="px-4 py-4 text-right">
                          <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-primary">
                            <MoreVertical size={16} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  <span>Showing {actionRows.length} actions</span>
                  <Link href="/tasks" className="font-semibold text-primary hover:underline">
                    View all actions
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyText>No actions.</EmptyText>
            )}
          </Panel>

          <Panel className="col-span-12 xl:col-span-8" title="Participations" icon={<CalendarDays size={19} aria-hidden="true" />}>
            {participations.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {participations.map((participation) => (
                  <ParticipationSummary
                    key={participation.id}
                    participation={participation}
                    logistics={logisticsByParticipation.get(participation.id)}
                  />
                ))}
              </div>
            ) : (
              <EmptyText>No participations.</EmptyText>
            )}
          </Panel>

          <Panel className="col-span-12 xl:col-span-4" title="Notes" icon={<FileText size={19} aria-hidden="true" />}>
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes.slice(0, 5).map((note) => (
                  <div key={note.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{note.note_type ?? "note"}</span>
                      <span>{note.created_at ? formatDate(note.created_at) : ""}</span>
                    </div>
                    <p className="line-clamp-3 whitespace-pre-line">{note.body ?? ""}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText>No notes.</EmptyText>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Panel({
  title,
  icon,
  action,
  className,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`space-y-4 ${className ?? ""}`}>
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

function MetaItem({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      {children}
    </span>
  );
}

function MetaLink({ href, icon, children }: { href: string | null | undefined; icon: React.ReactNode; children: React.ReactNode }) {
  if (!href) {
    return <MetaItem icon={icon}>{children}</MetaItem>;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-primary hover:underline">
      {icon}
      {children}
      <ExternalLinkIcon size={13} aria-hidden="true" />
    </a>
  );
}

function ContactCard({ item, companyId }: { item: ContactRow; companyId: string }) {
  const name = formatContactName(item.contacts);
  const primary = Boolean(item.is_primary);
  const returnTo = `/companies/${companyId}`;

  return (
    <div className={`flex items-center gap-4 p-4 ${primary ? "bg-primary/5" : "hover:bg-muted/50"}`}>
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
          primary ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-primary"
        }`}
      >
        {getInitials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {item.contacts?.id ? (
            <Link
              href={`/contacts/${item.contacts.id}?returnTo=${encodeURIComponent(returnTo)}`}
              className="truncate font-semibold text-primary hover:underline"
            >
              {name}
            </Link>
          ) : (
            <h4 className="truncate font-semibold text-primary">{name}</h4>
          )}
          {primary ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
              Primary
            </span>
          ) : null}
        </div>
        <p className="truncate text-sm text-muted-foreground">{item.contacts?.position ?? item.role ?? "No role"}</p>
      </div>
      <div className="hidden text-right text-sm md:block">
        <p className="font-mono text-xs text-primary">{item.contacts?.phone ?? "No phone"}</p>
        <p className="text-muted-foreground">{item.contacts?.email ?? "No email"}</p>
      </div>
      {item.contacts?.id ? (
        <div className="flex items-center gap-1">
          <Link
            href={`/contacts/${item.contacts.id}?edit=1&returnTo=${encodeURIComponent(returnTo)}`}
            title="Edit contact"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
          >
            <Pencil size={15} aria-hidden="true" />
          </Link>
          <DeleteContactButton contactId={item.contacts.id} returnTo={returnTo} compact />
        </div>
      ) : null}
      <div className="flex gap-1 md:hidden">
        {item.contacts?.phone ? <Phone size={16} className="text-muted-foreground" aria-hidden="true" /> : null}
        {item.contacts?.email ? <Mail size={16} className="text-muted-foreground" aria-hidden="true" /> : null}
      </div>
    </div>
  );
}

function ActionIcon({ type }: { type: string | null }) {
  const className = "mt-0.5 shrink-0 text-primary";

  if (type === "material") {
    return <PackageCheck size={18} className={className} aria-hidden="true" />;
  }

  if (type === "smm") {
    return <Megaphone size={18} className={className} aria-hidden="true" />;
  }

  return <ClipboardList size={18} className={className} aria-hidden="true" />;
}

function ParticipationSummary({
  participation,
  logistics,
}: {
  participation: ParticipationRow;
  logistics: LogisticsRow | undefined;
}) {
  const logisticsValues = logistics
    ? [
        logistics.badges_status,
        logistics.check_in_status,
        logistics.conference_status,
        logistics.electricity_status,
        logistics.fascia_status,
        logistics.furniture_status,
        logistics.internet_status,
        logistics.room_asset_status,
        logistics.stand_design_status,
      ]
    : [];
  const completedLogistics = logisticsValues.filter((value) => value === "completed").length;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/participations/${participation.id}`} className="truncate font-semibold text-primary hover:underline">
            {participation.events?.event_name ?? "No event"}
          </Link>
          <p className="truncate text-sm text-muted-foreground">
            {[participation.events?.venue_name, participation.events?.start_date].filter(Boolean).join(" / ") || "No event dates"}
          </p>
        </div>
        <StatusBadge value={participation.status} />
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <InfoBlock label="Package" value={participation.package_name ?? "No package"} />
        <InfoBlock label="Payment" value={participation.payment_status ?? "not_started"} />
        <InfoBlock
          label="Logistics"
          value={logisticsValues.length > 0 ? `${completedLogistics}/${logisticsValues.length} complete` : "No logistics"}
        />
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1">{value}</div>
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

function TextAreaField({
  label,
  name,
  defaultValue,
  rows = 5,
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

function formatContactName(contact: ContactRow["contacts"]) {
  if (!contact) {
    return "Unnamed contact";
  }

  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "Unnamed contact";
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function uniqueIds(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  return result;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function emptyResult<T>() {
  return { data: [] as T[], error: null };
}

function getFlashMessage(notice?: string, error?: string) {
  if (error) {
    const message =
      {
        company_name_required: "Company name is required.",
        company_update_failed: "Failed to save company details.",
        contact_identity_required: "Add at least a contact name or email.",
        contact_create_failed: "Failed to create contact.",
        contact_update_failed: "Failed to update contact.",
        contact_link_failed: "Failed to link contact to company.",
        contact_not_found: "Contact was not found.",
        contact_delete_failed: "Failed to delete contact.",
        brand_required: "Select a brand first.",
        brand_not_found: "Selected brand was not found.",
        brand_assign_failed: "Failed to assign brand.",
      }[error] ?? "The operation failed.";

    return { type: "error" as const, message };
  }

  if (notice) {
    const message =
      {
        company_saved: "Company details saved.",
        contact_saved: "Contact saved.",
        contact_updated: "Contact updated.",
        contact_deleted: "Contact deleted.",
        brand_assigned: "Brand assigned.",
      }[notice] ?? "Saved.";

    return { type: "success" as const, message };
  }

  return null;
}
