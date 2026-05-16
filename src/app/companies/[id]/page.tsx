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
  Map as MapIcon,
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
import { StatusBadge } from "@/components/status-badge";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 30;

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

type BoothAssignmentRow = {
  participation_id: string | null;
  booths: {
    booth_number: string;
    hall: string | null;
    zone: string | null;
    area_sqm: number | null;
    status: string | null;
  } | null;
};

type BrandRow = Pick<
  Database["public"]["Tables"]["brands"]["Row"],
  "id" | "brand_name" | "website" | "brand_logo_url" | "country"
>;

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

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireActiveProfile();

  const { company, contacts, participations, notes, actions, booths, logistics, brands } = await loadCached(
    {
      keyParts: ["company-detail", profile.organization_id, id],
      tags: [cacheTags.companies, cacheTags.company(id), cacheTags.participations, cacheTags.brands, cacheTags.actions, cacheTags.notes],
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

      const [boothsResult, participationBrandsResult, logisticsResult] =
        participationIds.length > 0
          ? await Promise.all([
              supabase
                .from("booth_assignments")
                .select("participation_id,booths(booth_number,hall,zone,area_sqm,status)")
                .in("participation_id", participationIds),
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
          : [emptyResult(), emptyResult(), emptyResult()];

      const relationError =
        boothsResult.error ??
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
              .select("id,brand_name,website,brand_logo_url,country")
              .in("id", brandIds)
              .order("brand_name", { ascending: true })
          : emptyResult<BrandRow>();

      if (brandsResult.error) {
        throw new Error(brandsResult.error.message);
      }

      return {
        company: companyResult.data as Company,
        contacts: (contactsResult.data ?? []) as unknown as ContactRow[],
        participations,
        notes: (notesResult.data ?? []) as NoteRow[],
        actions: ((actionsResult.data ?? []) as CompanyActionRow[]).slice(0, 8),
        booths: (boothsResult.data ?? []) as unknown as BoothAssignmentRow[],
        logistics: (logisticsResult.data ?? []) as LogisticsRow[],
        brands: (brandsResult.data ?? []) as BrandRow[],
      };
    },
  );

  const boothsByParticipation = groupBy(booths, (row) => row.participation_id);
  const logisticsByParticipation = new Map(logistics.map((row) => [row.participation_id, row]));
  const actionRows = actions;
  const allBooths = booths.filter((row) => row.booths);
  const brandPortfolio = brands;
  const location = [company.city, company.country].filter(Boolean).join(", ") || "No location";

  return (
    <AppShell title="Company Detail">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/companies" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to companies
          </Link>
          <button
            disabled
            className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-medium text-primary opacity-50"
          >
            <Pencil size={16} aria-hidden="true" />
            Edit details
          </button>
        </div>

        <section className="rounded-lg border border-border bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {company.company_logo_url ? (
                <img src={company.company_logo_url} alt="" loading="lazy" className="h-full w-full object-contain" />
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
                {allBooths.length > 0 ? (
                  allBooths.slice(0, 4).map((booth) => (
                    <span key={`${booth.participation_id}-${booth.booths?.booth_number}`} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      Booth #{booth.booths?.booth_number}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">No booth</span>
                )}
              </div>
              <p className="mt-4 max-w-4xl whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {[company.address, company.description].filter(Boolean).join("\n\n") || "No company description yet."}
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-12 gap-4">
          <Panel
            className="col-span-12 lg:col-span-7"
            title="Company Contacts"
            icon={<Users size={19} aria-hidden="true" />}
            action={
              <button disabled className="inline-flex cursor-not-allowed items-center gap-1 text-xs font-semibold text-primary opacity-50">
                <Plus size={14} aria-hidden="true" />
                Add contact
              </button>
            }
          >
            {contacts.length > 0 ? (
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {contacts.map((item) => (
                  <ContactCard key={item.contacts?.id ?? item.role ?? "contact"} item={item} />
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
              <button disabled className="inline-flex cursor-not-allowed items-center gap-1 text-xs font-semibold text-primary opacity-50">
                <Plus size={14} aria-hidden="true" />
                Assign brand
              </button>
            }
          >
            {brandPortfolio.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {brandPortfolio.slice(0, 7).map((brand) => (
                  <BrandTile key={brand.id} brand={brand} />
                ))}
                {brandPortfolio.length > 7 ? (
                  <div className="flex min-h-24 flex-col items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    +{brandPortfolio.length - 7} more
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyText>No brands.</EmptyText>
            )}

            <div className="mt-5 rounded-lg border border-border bg-muted/50 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
                <MapIcon size={15} aria-hidden="true" />
                Booth Allocation Map
              </h4>
              <BoothMap booths={allBooths} />
            </div>
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
                    booths={boothsByParticipation.get(participation.id) ?? []}
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

function ContactCard({ item }: { item: ContactRow }) {
  const name = formatContactName(item.contacts);
  const primary = Boolean(item.is_primary);

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
            <Link href={`/contacts/${item.contacts.id}`} className="truncate font-semibold text-primary hover:underline">
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
      <div className="flex gap-1 md:hidden">
        {item.contacts?.phone ? <Phone size={16} className="text-muted-foreground" aria-hidden="true" /> : null}
        {item.contacts?.email ? <Mail size={16} className="text-muted-foreground" aria-hidden="true" /> : null}
      </div>
    </div>
  );
}

function BrandTile({ brand }: { brand: BrandRow }) {
  return (
    <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border p-3 text-center hover:bg-muted/50">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-muted">
        {brand.brand_logo_url ? (
          <img src={brand.brand_logo_url} alt="" loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <Tags size={22} className="text-primary" aria-hidden="true" />
        )}
      </div>
      <ExternalLink href={brand.website}>{brand.brand_name}</ExternalLink>
    </div>
  );
}

function BoothMap({ booths }: { booths: BoothAssignmentRow[] }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute inset-4 grid grid-cols-4 gap-2">
        {booths.slice(0, 8).map((booth, index) => (
          <div
            key={`${booth.participation_id}-${booth.booths?.booth_number}-${index}`}
            className={`flex items-center justify-center rounded border text-[10px] font-bold ${
              index === 0 ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border bg-muted text-primary"
            }`}
          >
            {booth.booths?.booth_number}
          </div>
        ))}
      </div>
      {booths.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">No booth assigned</div>
      ) : null}
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
  booths,
  logistics,
}: {
  participation: ParticipationRow;
  booths: BoothAssignmentRow[];
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
        <InfoBlock label="Booths" value={booths.map((item) => item.booths?.booth_number).filter(Boolean).join(", ") || "No booths"} />
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

function ExternalLink({ href, children }: { href: string | null | undefined; children: React.ReactNode }) {
  if (!href) {
    return <span>{children}</span>;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
      {children}
    </a>
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

function emptyResult<T>() {
  return { data: [] as T[], error: null };
}
