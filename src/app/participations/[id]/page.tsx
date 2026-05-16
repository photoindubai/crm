/* eslint-disable @next/next/no-img-element -- CRM logos intentionally use native lazy-loaded images. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, ClipboardList, Tags, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MediaCardGrid, MediaThumbnailButton } from "@/components/media-preview";
import { StatusBadge } from "@/components/status-badge";
import { cacheTags } from "@/lib/cache-tags";
import { requireActiveProfile } from "@/lib/auth";
import { loadCached } from "@/lib/server-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

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
type BrandLinkRow = Pick<Database["public"]["Tables"]["participation_brands"]["Row"], "brand_id">;
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

export default async function ParticipationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireActiveProfile();

  const { participation, company, event, contacts, booths, brands, materials, actions, templates } = await loadCached(
    {
      keyParts: ["participation-detail", profile.organization_id, id],
      tags: [cacheTags.participations, cacheTags.participation(id), cacheTags.companies, cacheTags.events, cacheTags.brands, cacheTags.actions, cacheTags.actionTemplates],
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
      const [companyResult, eventResult, contactsResult, boothsResult, brandLinksResult, materialsResult, actionsResult, templatesResult] =
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
            .select("role,is_primary,contacts(id,first_name,last_name,email,phone,position)")
            .eq("participation_id", id)
            .order("is_primary", { ascending: false }),
          supabase
            .from("booth_assignments")
            .select("booths(booth_number,hall,zone,area_sqm,status)")
            .eq("participation_id", id),
          supabase.from("participation_brands").select("brand_id").eq("participation_id", id),
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
        ]);

      const firstError =
        companyResult.error ??
        eventResult.error ??
        contactsResult.error ??
        boothsResult.error ??
        brandLinksResult.error ??
        materialsResult.error ??
        actionsResult.error ??
        templatesResult.error;

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
        booths: (boothsResult.data ?? []) as unknown as BoothRow[],
        brands: (brandsResult.data ?? []) as BrandRow[],
        materials: ((materialsResult.data ?? []) as MaterialRow[]).filter((item) => Boolean(item.url)),
        actions: (actionsResult.data ?? []) as ActionRow[],
        templates: (templatesResult.data ?? []) as TemplateRow[],
      };
    },
  );

  const requiredActions = actions.filter((action) => action.is_required);
  const optionalActions = actions.filter((action) => !action.is_required);
  const displayName = participation.display_name ?? company?.company_name ?? "Unnamed participant";

  return (
    <AppShell title="Participant Detail">
      <div className="space-y-6">
        <Link href="/participations" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to participations
        </Link>

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

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Participant Contacts" icon={<Users size={18} aria-hidden="true" />}>
            {contacts.length > 0 ? (
              <div className="divide-y divide-border rounded-lg border border-border">
                {contacts.map((item) => (
                  <ContactRow key={item.contacts?.id ?? item.role ?? "contact"} item={item} />
                ))}
              </div>
            ) : (
              <EmptyText>No participant contacts.</EmptyText>
            )}
          </Panel>

          <Panel title="Represented Brands" icon={<Tags size={18} aria-hidden="true" />}>
            {brands.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {brands.map((brand) => (
                  <a
                    key={brand.id}
                    href={brand.website ?? undefined}
                    target={brand.website ? "_blank" : undefined}
                    rel={brand.website ? "noreferrer" : undefined}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                      {brand.brand_logo_url ? <img src={brand.brand_logo_url} alt="" loading="lazy" className="h-full w-full object-contain" /> : <Tags size={18} />}
                    </div>
                    <span className="truncate font-medium">{brand.brand_name}</span>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyText>No brands assigned.</EmptyText>
            )}
          </Panel>
        </div>

        <Panel title="Materials" icon={<ClipboardList size={18} aria-hidden="true" />}>
          {materials.length > 0 ? (
            <MediaCardGrid
              items={materials.map((item) => ({
                id: item.id,
                title: item.title ?? item.material_type ?? "Material",
                url: item.url ?? "",
                subtitle: [item.material_type, item.status].filter(Boolean).join(" / ") || "Material",
                description: item.notes,
              }))}
            />
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

function ContactRow({ item }: { item: ContactLinkRow }) {
  const name = [item.contacts?.first_name, item.contacts?.last_name].filter(Boolean).join(" ") || item.contacts?.email || "Unnamed contact";

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
      <div className="text-right text-xs text-muted-foreground">
        <div>{item.contacts?.email ?? "No email"}</div>
        <div>{item.contacts?.phone ?? "No phone"}</div>
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

function emptyResult<T>(data: T = [] as T) {
  return { data, error: null };
}
